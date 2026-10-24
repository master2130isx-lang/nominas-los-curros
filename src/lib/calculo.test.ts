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
      adelantos: [{ fecha: "2026-10-20", saldo: 200, descripcion: "martes" }],
      abono: 200,
    });
    expect(r.total).toBe(1080);
    expect(r.lineas.map((l) => l.descripcion)).toEqual([
      "6 día(s) × $200.00",
      "Se quedó 2 horas",
      "Abono a préstamo del 20/10/2026 (martes), queda pagado",
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

describe("faltas en semana fija", () => {
  const celia = { formaPago: "semana" as const, tarifa: 2100, pasaje: 0, cantidad: 1, extras: [], adelantos: [], diasTrabajo: [1, 2, 4, 5, 6, 7] };

  it("descuenta el día más la parte del descanso, igual que la base de datos", () => {
    const r = calcularRecibo({
      ...celia,
      faltas: [
        { fecha: "2026-10-24", tipo: "justificada", fraccion: 1, nota: "permiso" },
        { fecha: "2026-10-23", tipo: "sin_goce", fraccion: 0.5, nota: "cita médica" },
        { fecha: "2026-10-21", tipo: "sin_aviso", fraccion: 1, nota: null },
      ],
    });
    expect(r.lineas.map((l) => [l.descripcion, l.importe])).toEqual([
      ["1 semana(s) × $2,100.00", 2100],
      ["Falta sin aviso el miércoles 21/10/2026: día $300.00 + parte del descanso $50.00", -350],
      ["Media falta con permiso sin goce el viernes 23/10/2026: día $150.00 + parte del descanso $25.00 (cita médica)", -175],
      ["Falta justificada el sábado 24/10/2026, se paga completo (permiso)", 0],
    ]);
    expect(r.total).toBe(1575);
  });

  it("con María ($2,400) la falta es $400: $342.86 del día y $57.14 del descanso", () => {
    const r = calcularRecibo({ ...celia, tarifa: 2400, faltas: [{ fecha: "2026-10-20", tipo: "sin_aviso", fraccion: 1, nota: null }] });
    expect(r.lineas[1]).toEqual({
      tipo: "falta",
      descripcion: "Falta sin aviso el martes 20/10/2026: día $342.86 + parte del descanso $57.14",
      importe: -400,
    });
  });

  it("si no trabaja 6 días, descuenta la parte de los días pactados", () => {
    const r = calcularRecibo({ ...celia, tarifa: 1000, diasTrabajo: [1, 2, 3, 4, 5, 6, 7], faltas: [{ fecha: "2026-10-20", tipo: "sin_aviso", fraccion: 1, nota: null }] });
    expect(r.lineas[1].descripcion).toBe("Falta sin aviso el martes 20/10/2026: 1 de 7 días pactados");
    expect(r.lineas[1].importe).toBe(-142.86);
  });

  it("no toca a los que cobran por día", () => {
    const r = calcularRecibo({ ...celia, formaPago: "dia", tarifa: 400, faltas: [{ fecha: "2026-10-20", tipo: "sin_aviso", fraccion: 1, nota: null }] });
    expect(r.lineas).toHaveLength(1);
  });

  it("describe la jornada reducida", () => {
    const r = calcularRecibo({ ...celia, tarifa: 1000, diasTrabajo: [1, 2, 3, 4, 5, 6, 7], horasDia: 2 });
    expect(r.lineas[0].descripcion).toBe("1 semana(s) × $1,000.00 · jornada reducida de 2 h diarias (todos los días)");
  });
});

describe("abonos a préstamos", () => {
  it("aplica el abono primero al más viejo y dice cuánto resta, igual que la base de datos", () => {
    const r = calcularRecibo({
      formaPago: "semana",
      tarifa: 2100,
      pasaje: 0,
      cantidad: 1,
      extras: [],
      adelantos: [
        { fecha: "2026-10-20", saldo: 800, descripcion: null },
        { fecha: "2026-10-10", saldo: 300, descripcion: "medicina" },
      ],
      abono: 500,
    });
    expect(r.lineas.slice(1)).toEqual([
      { tipo: "adelanto", descripcion: "Abono a préstamo del 10/10/2026 (medicina), queda pagado", importe: -300 },
      { tipo: "adelanto", descripcion: "Abono a préstamo del 20/10/2026, resta $600.00", importe: -200 },
    ]);
    expect(r.total).toBe(1600);
  });

  it("con abono de $0 no agrega nada", () => {
    const r = calcularRecibo({ formaPago: "dia", tarifa: 200, pasaje: 0, cantidad: 1, extras: [], adelantos: [{ fecha: "2026-10-20", saldo: 800, descripcion: null }], abono: 0 });
    expect(r.lineas).toHaveLength(1);
  });
});
