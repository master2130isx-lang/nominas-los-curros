import { describe, expect, it } from "vitest";
import {
  cantidadSugerida,
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

const celia = { id: "c", forma_pago: "semana" as const, pago_cuando: "dia_semana" as const, pago_dia_semana: 2, dias_trabajo: [1, 2, 4, 5, 6, 7] };
const caro = { id: "k", forma_pago: "dia" as const, pago_cuando: "cada_dia" as const, pago_dia_semana: null, dias_trabajo: [6, 7] };
const josue = { id: "j", forma_pago: "tarea" as const, pago_cuando: "al_terminar" as const, pago_dia_semana: null, dias_trabajo: [2, 6] };

describe("programa de pagos", () => {
  it("numera los días como ISO", () => {
    expect(diaIso("2026-10-19")).toBe(1); // lunes
    expect(diaIso("2026-10-24")).toBe(6); // sábado
    expect(diaIso("2026-10-25")).toBe(7); // domingo
  });

  it("sabe a quién le toca cobrar", () => {
    expect(leTocaCobrar(celia, "2026-10-20")).toBe(true); // martes
    expect(leTocaCobrar(celia, "2026-10-21")).toBe(false);
    expect(leTocaCobrar(caro, "2026-10-24")).toBe(true);
    expect(leTocaCobrar(caro, "2026-10-20")).toBe(false);
    expect(leTocaCobrar(josue, "2026-10-20")).toBe(true);
  });

  it("sugiere la semana que termina el día de pago", () => {
    expect(periodoSugerido(celia, "2026-10-20")).toEqual({ inicio: "2026-10-14", fin: "2026-10-20" });
    expect(periodoSugerido(caro, "2026-10-24")).toEqual({ inicio: "2026-10-24", fin: "2026-10-24" });
    expect(cantidadSugerida(caro)).toBe(1);
    expect(cantidadSugerida({ ...caro, forma_pago: "hora" })).toBeNull();
  });

  it("agrupa por día de pago", () => {
    expect(grupoPago(celia)).toMatchObject({ clave: "d2", nombre: "Cobran el martes" });
    expect(grupoPago(caro).clave).toBe("diario");
    expect(grupoPago(josue).clave).toBe("tarea");
    expect(textoDias([6, 7])).toBe("sáb, dom");
    expect(textoDias([])).toBe("Sin días marcados");
  });

  it("encuentra recibos que cubren un día y pendientes anteriores", () => {
    const recibos = [
      { trabajador_id: "c", periodo_inicio: "2026-10-14", periodo_fin: "2026-10-20", fecha_pago: "2026-10-20", estado: "firmado" },
      { trabajador_id: "k", periodo_inicio: "2026-10-18", periodo_fin: "2026-10-18", fecha_pago: "2026-10-18", estado: "cancelado" },
    ];
    expect(reciboQueCubre(recibos, "c", "2026-10-20")).toBeTruthy();
    expect(reciboQueCubre(recibos, "k", "2026-10-18")).toBeUndefined();
    const p = pendientesAnteriores([celia, caro], recibos, "2026-10-24");
    expect(p.map((x) => `${x.trabajador.id} ${x.fecha}`)).toEqual(["k 2026-10-18", "k 2026-10-17"]);
  });

  it("no cuenta pendientes de antes de que se diera de alta", () => {
    const p = pendientesAnteriores([{ ...caro, alta: "2026-10-18" }], [], "2026-10-24");
    expect(p.map((x) => x.fecha)).toEqual(["2026-10-18"]);
  });
});

describe("faltas en la vista del día", () => {
  const falta = (trabajador_id: string, fecha: string, tipo = "sin_aviso", fraccion = 1) => ({ trabajador_id, fecha, tipo, fraccion });

  it("con falta completa ya no le toca recibo a quien cobra por día, pero sí a los de semana", () => {
    expect(cobraEseDia(caro, [falta("k", "2026-10-24")], "2026-10-24")).toBe(false);
    expect(cobraEseDia(caro, [falta("k", "2026-10-24", "sin_aviso", 0.5)], "2026-10-24")).toBe(true);
    const celiaMartes = "2026-10-27";
    expect(cobraEseDia(celia, [falta("c", celiaMartes)], celiaMartes)).toBe(true);
  });

  it("una falta quita el día de los pendientes", () => {
    const p = pendientesAnteriores([caro], [], "2026-10-24", [falta("k", "2026-10-18", "justificada")]);
    expect(p.map((x) => x.fecha)).toEqual(["2026-10-17"]);
  });

  it("cuenta las faltas sin aviso de los últimos 30 días", () => {
    const c = faltasSinAviso30(
      [falta("k", "2026-09-24"), falta("k", "2026-09-25"), falta("k", "2026-10-10"), falta("k", "2026-10-20", "justificada"), falta("k", "2026-10-24")],
      "2026-10-24",
    );
    expect(c.get("k")).toBe(3);
  });
});
