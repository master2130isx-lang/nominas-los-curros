import { describe, expect, it } from "vitest";
import {
  agruparPendientes,
  cantidadSugerida,
  DIAS_PENDIENTES,
  iniciales,
  tonoAvatar,
  diaIso,
  grupoPago,
  leTocaCobrar,
  cobraEseDia,
  faltasSinAviso30,
  pendientesAnteriores,
  periodoSugerido,
  reciboQueCubre,
  textoDias,
} from "./programa";

const semanal = { id: "s", forma_pago: "semana" as const, pago_cuando: "dia_semana" as const, pago_dia_semana: 2, dias_trabajo: [1, 2, 4, 5, 6, 7] };
const diaria = { id: "d", forma_pago: "dia" as const, pago_cuando: "cada_dia" as const, pago_dia_semana: null, dias_trabajo: [6, 7] };
const porTarea = { id: "t", forma_pago: "tarea" as const, pago_cuando: "al_terminar" as const, pago_dia_semana: null, dias_trabajo: [2, 6] };

describe("programa de pagos", () => {
  it("numera los días como ISO", () => {
    expect(diaIso("2026-10-19")).toBe(1); // lunes
    expect(diaIso("2026-10-24")).toBe(6); // sábado
    expect(diaIso("2026-10-25")).toBe(7); // domingo
  });

  it("sabe a quién le toca cobrar", () => {
    expect(leTocaCobrar(semanal, "2026-10-20")).toBe(true); // martes
    expect(leTocaCobrar(semanal, "2026-10-21")).toBe(false);
    expect(leTocaCobrar(diaria, "2026-10-24")).toBe(true);
    expect(leTocaCobrar(diaria, "2026-10-20")).toBe(false);
    expect(leTocaCobrar(porTarea, "2026-10-20")).toBe(true);
  });

  it("sugiere la semana que termina el día de pago", () => {
    expect(periodoSugerido(semanal, "2026-10-20")).toEqual({ inicio: "2026-10-14", fin: "2026-10-20" });
    expect(periodoSugerido(diaria, "2026-10-24")).toEqual({ inicio: "2026-10-24", fin: "2026-10-24" });
    expect(cantidadSugerida(diaria)).toBe(1);
    expect(cantidadSugerida({ ...diaria, forma_pago: "hora" })).toBeNull();
  });

  it("agrupa por día de pago", () => {
    expect(grupoPago(semanal)).toMatchObject({ clave: "d2", nombre: "Cobran el martes" });
    expect(grupoPago(diaria).clave).toBe("diario");
    expect(grupoPago(porTarea).clave).toBe("tarea");
    expect(textoDias([6, 7])).toBe("sáb, dom");
    expect(textoDias([])).toBe("Sin días marcados");
  });

  it("encuentra recibos que cubren un día y pendientes anteriores", () => {
    const recibos = [
      { trabajador_id: "s", periodo_inicio: "2026-10-14", periodo_fin: "2026-10-20", fecha_pago: "2026-10-20", estado: "firmado" },
      { trabajador_id: "d", periodo_inicio: "2026-10-18", periodo_fin: "2026-10-18", fecha_pago: "2026-10-18", estado: "cancelado" },
    ];
    expect(reciboQueCubre(recibos, "s", "2026-10-20")).toBeTruthy();
    expect(reciboQueCubre(recibos, "d", "2026-10-18")).toBeUndefined();
    const p = pendientesAnteriores([semanal, diaria], recibos, "2026-10-24", [], 7);
    expect(p.map((x) => `${x.trabajador.id} ${x.fecha}`)).toEqual(["d 2026-10-18", "d 2026-10-17"]);
  });

  it("no cuenta pendientes de antes de la fecha en que empezó a trabajar", () => {
    const p = pendientesAnteriores([{ ...diaria, desde: "2026-10-18" }], [], "2026-10-24");
    expect(p.map((x) => x.fecha)).toEqual(["2026-10-18"]);
  });
});

describe("faltas en la vista del día", () => {
  const falta = (trabajador_id: string, fecha: string, tipo = "sin_aviso", fraccion = 1) => ({ trabajador_id, fecha, tipo, fraccion });

  it("con falta completa ya no le toca recibo a quien cobra por día, pero sí a los de semana", () => {
    expect(cobraEseDia(diaria, [falta("d", "2026-10-24")], "2026-10-24")).toBe(false);
    expect(cobraEseDia(diaria, [falta("d", "2026-10-24", "sin_aviso", 0.5)], "2026-10-24")).toBe(true);
    const diaDePago = "2026-10-27";
    expect(cobraEseDia(semanal, [falta("s", diaDePago)], diaDePago)).toBe(true);
  });

  it("una falta quita el día de los pendientes", () => {
    const p = pendientesAnteriores([diaria], [], "2026-10-24", [falta("d", "2026-10-18", "justificada")], 7);
    expect(p.map((x) => x.fecha)).toEqual(["2026-10-17"]);
  });

  it("cuenta las faltas sin aviso de los últimos 30 días", () => {
    const c = faltasSinAviso30(
      [falta("d", "2026-09-24"), falta("d", "2026-09-25"), falta("d", "2026-10-10"), falta("d", "2026-10-20", "justificada"), falta("d", "2026-10-24")],
      "2026-10-24",
    );
    expect(c.get("d")).toBe(3);
  });
});

describe("pendientes para ponerse al corriente", () => {
  it("revisa más de 7 días: alguien dado de alta hoy muestra pendientes de hace 10 días", () => {
    // El alta en la plataforma (creado_en) ya no limita: lo de antes de la herramienta también sale.
    const todos = [1, 2, 3, 4, 5, 6, 7];
    const nuevo = { ...diaria, dias_trabajo: todos, desde: null };
    const p = pendientesAnteriores([nuevo], [], "2026-10-24");
    expect(DIAS_PENDIENTES).toBeGreaterThanOrEqual(10);
    expect(p).toHaveLength(DIAS_PENDIENTES);
    expect(p.map((x) => x.fecha)).toContain("2026-10-14"); // hace 10 días
  });

  it("los de pago semanal salen en su día de pago si no tienen recibo", () => {
    const p = pendientesAnteriores([semanal], [], "2026-10-24");
    expect(p.map((x) => x.fecha)).toEqual(["2026-10-20", "2026-10-13"]); // martes
  });

  it("agrupa los pendientes por trabajador", () => {
    const p = pendientesAnteriores([semanal, diaria], [], "2026-10-24", [], 7);
    const g = agruparPendientes(p);
    expect(g.map((x) => [x.trabajador.id, x.fechas])).toEqual([
      ["s", ["2026-10-20"]],
      ["d", ["2026-10-18", "2026-10-17"]],
    ]);
  });

  it("arma iniciales y un tono estable para el avatar", () => {
    expect(iniciales("Ana Lucía Prueba")).toBe("AP");
    expect(iniciales("rocío")).toBe("RO");
    expect(iniciales("  ")).toBe("?");
    expect(tonoAvatar("Ana")).toBe(tonoAvatar("Ana"));
    expect(tonoAvatar("Ana")).toBeGreaterThanOrEqual(0);
    expect(tonoAvatar("Ana")).toBeLessThan(4);
  });
});
