import { describe, expect, it } from "vitest";
import { compararConMinimo, descuentoPorFalta, salarioDiario, SALARIO_MINIMO_HORA } from "./ley";

const seisDias = [1, 2, 4, 5, 6, 7];

describe("salario diario y mínimo", () => {
  it("divide entre 7 a los de semana completa", () => {
    const celia = { forma_pago: "semana" as const, tarifa: 2100, dias_trabajo: seisDias, horas_dia: null };
    expect(salarioDiario(celia)).toBe(300);
    expect(descuentoPorFalta(celia)).toBe(350);
    // 7 × $315.04 = $2,205.28
    expect(compararConMinimo(celia)).toMatchObject({ minimo: 2205.28, arriba: false });
  });

  it("compara la jornada reducida de Natividad con el mínimo proporcional", () => {
    const nati = { forma_pago: "semana" as const, tarifa: 1000, dias_trabajo: [1, 2, 3, 4, 5, 6, 7], horas_dia: 2 };
    expect(SALARIO_MINIMO_HORA).toBe(39.38);
    expect(compararConMinimo(nati)).toEqual({ porHora: 71.43, minimo: 551.32, pago: 1000, periodo: "semana", arriba: true });
  });

  it("necesita las horas para comparar a los de pago por día", () => {
    const pablo = { forma_pago: "dia" as const, tarifa: 200, dias_trabajo: [1, 2, 3, 4, 5, 6], horas_dia: null };
    expect(compararConMinimo(pablo)).toBeNull();
    expect(compararConMinimo({ ...pablo, horas_dia: 5 })).toMatchObject({ porHora: 40, minimo: 196.9, arriba: true });
  });
});
