import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { calcularRecibo } from "@/lib/calculo";
import { ADMIN, BETO, conectar, ENCARGADA, error, INACTIVO, ROSA, SIN_PERFIL, type Bd } from "./bd";

let bd: Bd;
beforeAll(async () => {
  bd = await conectar();
});
afterAll(async () => {
  await bd.end();
});
// Cada prueba en una transacción que se deshace: la base local queda igual.
beforeEach(async () => {
  await bd.query("begin");
});
afterEach(async () => {
  await bd.query("rollback");
});

const crearRecibo = async (trabajador: string, inicio: string, fin: string, cantidad = 1) =>
  (
    await bd.query<{ id: string; folio: number; total: string }>(
      "select id, folio, total from crear_recibo($1, $2, $3, $3, $4)",
      [trabajador, inicio, fin, cantidad],
    )
  ).rows[0];

describe("RLS: solo usuarios con perfil activo", () => {
  for (const [nombre, usuario] of [
    ["un usuario inactivo", INACTIVO],
    ["una cuenta sin perfil", SIN_PERFIL],
    ["alguien sin sesión (anon)", null],
  ] as const) {
    it(`${nombre} no lee ni escribe`, async () => {
      await bd.como(usuario);
      for (const tabla of ["trabajadores", "recibos", "recibo_conceptos", "faltas", "adelantos", "abonos", "trabajadores_bitacora"]) {
        const r = await bd.query(`select count(*)::int as n from ${tabla}`);
        expect(r.rows[0].n, tabla).toBe(0);
      }
      await bd.query("savepoint s");
      const e1 = await error(bd.query("insert into faltas (trabajador_id, fecha, tipo) values ($1, '2026-09-09', 'sin_aviso')", [BETO]));
      expect(e1.code).toBe("42501");
      await bd.query("rollback to savepoint s");
      const e2 = await error(bd.query("update trabajadores set telefono = '1' where id = $1 returning id", [BETO]).then((r) => {
        if (r.rowCount === 0) throw Object.assign(new Error("sin filas"), { code: "sin_filas" });
      }));
      expect(["42501", "sin_filas"]).toContain(e2.code);
      await bd.query("rollback to savepoint s");
      const e3 = await error(bd.query("select crear_recibo($1, '2026-09-09', '2026-09-09', '2026-09-09', 1)", [BETO]));
      expect(["42501", "P0001"]).toContain(e3.code);
    });
  }

  it("RLS está activado en todas las tablas y las funciones security definer fijan search_path", async () => {
    const sinRls = await bd.query("select tablename from pg_tables where schemaname = 'public' and not rowsecurity");
    expect(sinRls.rows).toEqual([]);
    const sinRuta = await bd.query(`
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.prosecdef
         and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`);
    expect(sinRuta.rows).toEqual([]);
  });
});

describe("Faltas en días ya pagados", () => {
  it("no se puede anotar una falta en un periodo cubierto por un recibo vigente; si se cancela, sí", async () => {
    await bd.como(ENCARGADA);
    const r = await crearRecibo(ROSA, "2026-09-06", "2026-09-12");
    await bd.query("savepoint s");
    const e = await error(bd.query("insert into faltas (trabajador_id, fecha, tipo) values ($1, '2026-09-10', 'sin_aviso')", [ROSA]));
    expect(e.message).toContain(`folio ${String(r.folio).padStart(4, "0")}`);
    await bd.query("rollback to savepoint s");
    await bd.como(ADMIN);
    await bd.query("select cancelar_recibo($1, 'prueba')", [r.id]);
    await bd.como(ENCARGADA);
    const ok = await bd.query("insert into faltas (trabajador_id, fecha, tipo) values ($1, '2026-09-10', 'sin_aviso') returning id", [ROSA]);
    expect(ok.rowCount).toBe(1);
  });
});

describe("Sin filtraciones a usuarios inactivos", () => {
  it("un inactivo que intenta anotar en un día pagado recibe el rechazo de RLS, no el folio", async () => {
    await bd.como(ENCARGADA);
    await crearRecibo(ROSA, "2026-09-06", "2026-09-12");
    await bd.como(INACTIVO);
    const e = await error(bd.query("insert into faltas (trabajador_id, fecha, tipo) values ($1, '2026-09-10', 'sin_aviso')", [ROSA]));
    expect(e.code).toBe("42501");
    expect(e.message).not.toMatch(/folio/);
  });
});

describe("Editar una falta pendiente", () => {
  it("cambia de sin aviso a sin goce y el siguiente recibo descuenta lo nuevo", async () => {
    await bd.como(ENCARGADA);
    const { rows } = await bd.query<{ id: string }>(
      "insert into faltas (trabajador_id, fecha, tipo) values ($1, '2026-09-09', 'sin_aviso') returning id",
      [ROSA],
    );
    const editada = await bd.query("update faltas set tipo = 'sin_goce', nota = 'cita' where id = $1 returning id", [rows[0].id]);
    expect(editada.rowCount).toBe(1);
    const r = await crearRecibo(ROSA, "2026-09-06", "2026-09-12");
    // $2,184 − $312 (solo el día, ÷ 7) = $1,872; sin aviso habría sido − $364.
    expect(Number(r.total)).toBe(1872);
    const conceptos = await bd.query("select descripcion, importe from recibo_conceptos where recibo_id = $1 and tipo = 'falta'", [r.id]);
    expect(conceptos.rows[0].descripcion).toContain("con permiso sin goce");
    expect(Number(conceptos.rows[0].importe)).toBe(-312);
  });

  it("una falta que ya está en un recibo no se edita, y no se cambia la fecha ni el trabajador", async () => {
    await bd.como(ENCARGADA);
    const { rows } = await bd.query<{ id: string }>(
      "insert into faltas (trabajador_id, fecha, tipo) values ($1, '2026-09-09', 'sin_aviso') returning id",
      [ROSA],
    );
    await bd.query("savepoint s");
    const e = await error(bd.query("update faltas set fecha = '2026-09-08' where id = $1", [rows[0].id]));
    expect(e.message).toMatch(/solo se puede cambiar el tipo/);
    await bd.query("rollback to savepoint s");
    await crearRecibo(ROSA, "2026-09-06", "2026-09-12");
    const sinCambio = await bd.query("update faltas set tipo = 'justificada' where id = $1 returning id", [rows[0].id]);
    expect(sinCambio.rowCount).toBe(0);
  });

  it("la migración no alteró faltas existentes: la política de editar exige recibo_id null en using y with check", async () => {
    const p = await bd.query("select qual, with_check from pg_policies where tablename = 'faltas' and policyname = 'faltas_editar'");
    expect(p.rows[0].qual).toContain("recibo_id IS NULL");
    expect(p.rows[0].with_check).toContain("recibo_id IS NULL");
  });
});

describe("Tarifa y bajas solo para el administrador, con bitácora", () => {
  it("una encargada no cambia la tarifa ni da de baja, pero sí edita otros datos", async () => {
    await bd.como(ENCARGADA);
    await bd.query("savepoint s");
    const e = await error(bd.query("update trabajadores set tarifa = 9999 where id = $1", [BETO]));
    expect(e.message).toMatch(/Solo el administrador/);
    await bd.query("rollback to savepoint s");
    const e2 = await error(bd.query("update trabajadores set activo = false where id = $1", [BETO]));
    expect(e2.message).toMatch(/Solo el administrador/);
    await bd.query("rollback to savepoint s");
    const ok = await bd.query("update trabajadores set telefono = '4890000000' where id = $1 returning id", [BETO]);
    expect(ok.rowCount).toBe(1);
  });

  it("el administrador sí, y queda una fila en la bitácora con quién, cuándo, antes y después", async () => {
    await bd.como(ADMIN);
    await bd.query("update trabajadores set tarifa = 380 where id = $1", [BETO]);
    const b = await bd.query(
      "select campo, valor_anterior, valor_nuevo, cambiado_por, cambiado_en from trabajadores_bitacora where trabajador_id = $1 and campo = 'tarifa'",
      [BETO],
    );
    expect(b.rows).toHaveLength(1);
    expect(b.rows[0]).toMatchObject({ valor_anterior: "350.00", valor_nuevo: "380.00", cambiado_por: ADMIN });
    expect(b.rows[0].cambiado_en).toBeInstanceOf(Date);
  });

  it("la bitácora la leen los usuarios activos y nadie la edita ni la borra", async () => {
    await bd.como(ADMIN);
    await bd.query("update trabajadores set tarifa = 380 where id = $1", [BETO]);
    await bd.como(ENCARGADA);
    const vista = await bd.query("select count(*)::int as n from trabajadores_bitacora where trabajador_id = $1", [BETO]);
    expect(vista.rows[0].n).toBeGreaterThan(0);
    for (const sql of [
      "update trabajadores_bitacora set valor_nuevo = '1'",
      "delete from trabajadores_bitacora",
      `insert into trabajadores_bitacora (trabajador_id, campo) values ('${BETO}', 'tarifa')`,
    ]) {
      await bd.query("savepoint s");
      for (const usuario of [ENCARGADA, ADMIN]) {
        await bd.como(usuario);
        const e = await error(bd.query(sql));
        expect(e.code, sql).toBe("42501");
        await bd.query("rollback to savepoint s");
      }
    }
  });
});

describe("Cancelar recibos", () => {
  it("una encargada no puede cancelar; el admin sí y libera las faltas", async () => {
    await bd.como(ENCARGADA);
    await bd.query("insert into faltas (trabajador_id, fecha, tipo) values ($1, '2026-09-09', 'sin_aviso')", [ROSA]);
    const r = await crearRecibo(ROSA, "2026-09-06", "2026-09-12");
    await bd.query("savepoint s");
    const e = await error(bd.query("select cancelar_recibo($1, 'x')", [r.id]));
    expect(e.message).toMatch(/Solo el administrador/);
    await bd.query("rollback to savepoint s");
    await bd.como(ADMIN);
    await bd.query("select cancelar_recibo($1, 'error de captura')", [r.id]);
    const f = await bd.query("select recibo_id from faltas where trabajador_id = $1 and fecha = '2026-09-09'", [ROSA]);
    expect(f.rows[0].recibo_id).toBeNull();
  });
});

describe("Paridad del cálculo: crear_recibo (BD) = calcularRecibo (pantalla)", () => {
  it.each([
    ["semana fija con falta sin aviso y media sin goce", ROSA, "2026-09-06", "2026-09-12", 1],
    ["por día con pasaje", BETO, "2026-09-07", "2026-09-12", 5.5],
  ])("%s", async (_n, trabajador, inicio, fin, cantidad) => {
    await bd.como(ENCARGADA);
    if (trabajador === ROSA) {
      await bd.query("insert into faltas (trabajador_id, fecha, tipo) values ($1, '2026-09-08', 'sin_aviso')", [ROSA]);
      await bd.query("insert into faltas (trabajador_id, fecha, tipo, fraccion, nota) values ($1, '2026-09-10', 'sin_goce', 0.5, 'cita')", [ROSA]);
    }
    const t = (await bd.query("select forma_pago, tarifa, pasaje, dias_trabajo, horas_dia from trabajadores where id = $1", [trabajador])).rows[0];
    const faltas = (await bd.query("select fecha::text, tipo, fraccion, nota from faltas where trabajador_id = $1 and recibo_id is null", [trabajador])).rows;
    const r = await crearRecibo(trabajador, inicio, fin, cantidad);
    const conceptos = (await bd.query("select descripcion, importe from recibo_conceptos where recibo_id = $1 order by orden", [r.id])).rows;
    const previa = calcularRecibo({
      formaPago: t.forma_pago,
      tarifa: Number(t.tarifa),
      pasaje: Number(t.pasaje),
      cantidad,
      extras: [],
      adelantos: [],
      faltas: faltas.map((f) => ({ fecha: f.fecha, tipo: f.tipo, fraccion: Number(f.fraccion), nota: f.nota })),
      diasTrabajo: t.dias_trabajo,
      horasDia: t.horas_dia === null ? null : Number(t.horas_dia),
    });
    expect(Number(r.total)).toBe(previa.total);
    expect(conceptos.map((c) => [c.descripcion, Number(c.importe)])).toEqual(previa.lineas.map((l) => [l.descripcion, l.importe]));
  });
});
