import { describe, expect, it } from "vitest";
import { compararConMinimo, descuentoPorFalta, salarioDiario, SALARIO_MINIMO_HORA } from "./ley";

const seisDias = [1, 2, 4, 5, 6, 7];

describe("salario diario y mínimo", () => {
  it("divide entre 7 a los de semana completa", () => {
    const semanal = { forma_pago: "semana" as const, tarifa: 2184, dias_trabajo: seisDias, horas_dia: null };
    expect(salarioDiario(semanal)).toBe(312);
    expect(descuentoPorFalta(semanal)).toBe(364);
    // 7 × $315.04 = $2,205.28
    expect(compararConMinimo(semanal)).toMatchObject({ minimo: 2205.28, arriba: false });
  });

  it("compara una jornada reducida con el mínimo proporcional", () => {
    const reducida = { forma_pago: "semana" as const, tarifa: 1000, dias_trabajo: [1, 2, 3, 4, 5, 6, 7], horas_dia: 2 };
    expect(SALARIO_MINIMO_HORA).toBe(39.38);
    expect(compararConMinimo(reducida)).toEqual({ porHora: 71.43, minimo: 551.32, pago: 1000, periodo: "semana", arriba: true });
  });

  it("necesita las horas para comparar a los de pago por día", () => {
    const porDia = { forma_pago: "dia" as const, tarifa: 200, dias_trabajo: [1, 2, 3, 4, 5, 6], horas_dia: null };
    expect(compararConMinimo(porDia)).toBeNull();
    expect(compararConMinimo({ ...porDia, horas_dia: 5 })).toMatchObject({ porHora: 40, minimo: 196.9, arriba: true });
  });
});
