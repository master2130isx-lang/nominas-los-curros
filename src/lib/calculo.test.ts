import { describe, expect, it } from "vitest";
import { calcularRecibo } from "./calculo";
import { pesosConLetra } from "./letras";
import { semanaDe, esFecha, hoy } from "./fechas";
import { dinero, rango } from "./formato";

describe("calcularRecibo", () => {
  it("coincide con el ejemplo probado en la base de datos", () => {
    const r = calcularRecibo({
      formaPago: "dia",
      tarifa: 200,
      pasaje: 0,
      cantidad: 6,
      extras: [{ tipo: "extra", descripcion: "Se quedó 2 horas", importe: 80 }],
      adelantos: [{ fecha: "2026-10-20", monto: 200, descripcion: "martes" }],
    });
    expect(r.total).toBe(1080);
    expect(r.lineas.map((l) => l.descripcion)).toEqual([
      "6 día(s) × $200.00",
      "Se quedó 2 horas",
      "Descuento de adelanto del 20/10/2026 (martes)",
    ]);
  });

  it("multiplica el pasaje por día y lo suma una vez en semana fija", () => {
    const dia = calcularRecibo({ formaPago: "dia", tarifa: 500, pasaje: 30, cantidad: 1.5, extras: [], adelantos: [] });
    expect(dia.lineas[0].descripcion).toBe("1.5 día(s) × $500.00");
    expect(dia.total).toBe(795);
    const semana = calcularRecibo({ formaPago: "semana", tarifa: 2100, pasaje: 50, cantidad: 1, extras: [], adelantos: [] });
    expect(semana.total).toBe(2150);
  });

  it("resta préstamos e ignora extras en cero", () => {
    const r = calcularRecibo({
      formaPago: "semana",
      tarifa: 2100,
      pasaje: 0,
      cantidad: 1,
      extras: [
        { tipo: "prestamo", descripcion: "Abono", importe: 300 },
        { tipo: "extra", descripcion: "", importe: 0 },
      ],
      adelantos: [],
    });
    expect(r.total).toBe(1800);
    expect(r.lineas).toHaveLength(2);
  });
});

describe("pesosConLetra", () => {
  it.each([
    [1000, "Mil pesos 00/100 M.N."],
    [1, "Un peso 00/100 M.N."],
    [2100, "Dos mil cien pesos 00/100 M.N."],
    [1080.5, "Mil ochenta pesos 50/100 M.N."],
    [21, "Veintiún pesos 00/100 M.N."],
    [795, "Setecientos noventa y cinco pesos 00/100 M.N."],
    [14500, "Catorce mil quinientos pesos 00/100 M.N."],
    [101000, "Ciento un mil pesos 00/100 M.N."],
    [0, "Cero pesos 00/100 M.N."],
    [1000000, "Un millón de pesos 00/100 M.N."],
  ])("%d", (n, texto) => {
    expect(pesosConLetra(n)).toBe(texto);
  });
});

describe("fechas", () => {
  it("la semana va de lunes a domingo", () => {
    expect(semanaDe("2026-10-24")).toEqual({ inicio: "2026-10-19", fin: "2026-10-25" });
    expect(semanaDe("2026-10-25")).toEqual({ inicio: "2026-10-19", fin: "2026-10-25" });
    expect(semanaDe("2026-10-26")).toEqual({ inicio: "2026-10-26", fin: "2026-11-01" });
  });

  it("usa la hora del centro de México", () => {
    expect(hoy(new Date("2026-10-25T03:00:00Z"))).toBe("2026-10-24");
  });

  it("valida fechas", () => {
    expect(esFecha("2026-02-30")).toBe(false);
    expect(esFecha("2026-10-24")).toBe(true);
    expect(esFecha("24/10/2026")).toBe(false);
  });

  it("formatea rangos y dinero", () => {
    expect(rango("2026-10-19", "2026-10-24")).toBe("19 al 24 de octubre de 2026");
    expect(rango("2026-09-28", "2026-10-04")).toBe("28 de septiembre al 4 de octubre de 2026");
    expect(dinero(-200)).toBe("−$200.00");
    expect(dinero(14500)).toBe("$14,500.00");
  });
});
