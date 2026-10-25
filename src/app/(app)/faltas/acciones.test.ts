import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseFalso, type Llamada } from "@/pruebas/supabaseFalso";

const sesion = vi.hoisted(() => ({ cliente: null as unknown, rol: "encargado" }));
vi.mock("@/lib/sesion", () => ({
  requerirSesion: async () => ({ supabase: sesion.cliente, perfil: { id: "u", nombre: "Prueba", rol: sesion.rol, activo: true } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { anotarFalta, editarFalta, borrarFalta } = await import("./acciones");

const TRABAJADOR = "6f1c2c9e-8a37-4d4b-9a51-0c5a3f3b9d10";
const FALTA = "0b7e5a52-3f7c-4a0e-8d3f-9d1f4b8b2c11";
const RECIBO = "a3d2f1e0-1111-4222-8333-944455556666";

function formulario(campos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}
const inicial = { error: null, ok: false };
const insertos = (llamadas: Llamada[]) => llamadas.filter((l) => l.tabla === "faltas" && l.operacion === "insert");

describe("anotarFalta", () => {
  beforeEach(() => {
    sesion.cliente = null;
  });

  it("no guarda la falta si un recibo vigente ya cubre ese día, y responde con folio y enlace", async () => {
    const { cliente, llamadas } = supabaseFalso((l) =>
      l.tabla === "recibos" ? { data: { id: RECIBO, folio: 12 }, error: null } : undefined,
    );
    sesion.cliente = cliente;
    const r = await anotarFalta(inicial, formulario({ trabajador_id: TRABAJADOR, fecha: "2026-10-10", tipo: "sin_aviso" }));
    expect(r.ok).toBe(false);
    expect(r.error).toContain("folio 0012");
    expect(r.recibo).toEqual({ id: RECIBO, folio: "0012" });
    expect(insertos(llamadas)).toHaveLength(0);
    // Busca recibos no cancelados del trabajador cuyo periodo contiene la fecha.
    const busqueda = llamadas.find((l) => l.tabla === "recibos")!;
    expect(busqueda.filtros).toEqual(
      expect.arrayContaining([
        ["eq", "trabajador_id", TRABAJADOR],
        ["neq", "estado", "cancelado"],
        ["lte", "periodo_inicio", "2026-10-10"],
        ["gte", "periodo_fin", "2026-10-10"],
      ]),
    );
  });

  it("guarda la falta si no hay recibo vigente (por ejemplo, el que había está cancelado)", async () => {
    const { cliente, llamadas } = supabaseFalso();
    sesion.cliente = cliente;
    const r = await anotarFalta(
      inicial,
      formulario({ trabajador_id: TRABAJADOR, fecha: "2026-10-10", tipo: "sin_goce", media: "on", nota: " cita " }),
    );
    expect(r).toEqual({ error: null, ok: true });
    expect(insertos(llamadas)[0].datos).toEqual({ trabajador_id: TRABAJADOR, fecha: "2026-10-10", tipo: "sin_goce", fraccion: 0.5, nota: "cita" });
  });

  it("valida el trabajador como uuid, la fecha y el tipo antes de tocar la base de datos", async () => {
    const { cliente, llamadas } = supabaseFalso();
    sesion.cliente = cliente;
    expect((await anotarFalta(inicial, formulario({ trabajador_id: "abc", fecha: "2026-10-10", tipo: "sin_aviso" }))).error).toMatch(/no es válido/);
    expect((await anotarFalta(inicial, formulario({ trabajador_id: TRABAJADOR, fecha: "2026-02-30", tipo: "sin_aviso" }))).error).toMatch(/fecha/);
    expect((await anotarFalta(inicial, formulario({ trabajador_id: TRABAJADOR, fecha: "2026-10-10" }))).error).toMatch(/tipo/);
    expect(llamadas).toHaveLength(0);
  });

  it("traduce los errores de la base de datos", async () => {
    const { cliente } = supabaseFalso((l) =>
      l.operacion === "insert"
        ? { data: null, error: { code: "23505", message: 'duplicate key value violates unique constraint "faltas_trabajador_id_fecha_key"' } }
        : undefined,
    );
    sesion.cliente = cliente;
    const r = await anotarFalta(inicial, formulario({ trabajador_id: TRABAJADOR, fecha: "2026-10-10", tipo: "justificada" }));
    expect(r.error).toBe("Ya hay una falta anotada ese día para este trabajador.");
  });
});

describe("editarFalta y borrarFalta", () => {
  it("cambia tipo, medio día y nota solo de faltas sin recibo", async () => {
    const { cliente, llamadas } = supabaseFalso((l) => (l.operacion === "update" ? { data: [{ id: FALTA }], error: null } : undefined));
    sesion.cliente = cliente;
    const r = await editarFalta(inicial, formulario({ id: FALTA, tipo: "sin_goce" }));
    expect(r.ok).toBe(true);
    const u = llamadas.find((l) => l.operacion === "update")!;
    expect(u.datos).toEqual({ tipo: "sin_goce", fraccion: 1, nota: null });
    expect(u.filtros).toEqual(expect.arrayContaining([["eq", "id", FALTA], ["is", "recibo_id", null]]));
  });

  it("responde con un error controlado si la falta ya está en un recibo", async () => {
    const { cliente } = supabaseFalso((l) => (l.operacion === "update" ? { data: [], error: null } : undefined));
    sesion.cliente = cliente;
    const r = await editarFalta(inicial, formulario({ id: FALTA, tipo: "sin_goce" }));
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("ya está en un recibo") });
  });

  it("rechaza ids que no son uuid", async () => {
    const { cliente, llamadas } = supabaseFalso();
    sesion.cliente = cliente;
    expect((await borrarFalta("1 or 1=1")).error).toMatch(/no es válida/);
    expect((await editarFalta(inicial, formulario({ id: "x", tipo: "sin_goce" }))).ok).toBe(false);
    expect(llamadas).toHaveLength(0);
  });
});
