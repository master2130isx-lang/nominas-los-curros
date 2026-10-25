import { describe, expect, it } from "vitest";
import { GUIAS } from "./guias";
import { datosTrabajadorHoja } from "./hoja";

const base = {
  curp: null,
  rfc: null,
  nss: null,
  fecha_ingreso: null,
  horario: "8:00 a 16:00",
  dias_trabajo: [1, 2, 3, 4, 5, 6],
  horas_dia: 8,
  alimentacion: true,
  pago_cuando: "dia_semana" as const,
};

describe("datos del comprobante", () => {
  it("marca la comida como compensación solo a quien gana menos que el mínimo", () => {
    const bajo = datosTrabajadorHoja(base, { formaPago: "semana", tarifa: 2184, cantidad: 1, fechaPago: "2026-10-31" }, "2026-10-24");
    const arriba = datosTrabajadorHoja(base, { formaPago: "semana", tarifa: 2600, cantidad: 1, fechaPago: "2026-10-31" }, "2026-10-24");
    expect(bajo.bajoMinimo).toBe(true);
    expect(arriba.bajoMinimo).toBe(false);
    expect(bajo.cantidad).toBe("1 semana(s)");
  });

  it("los que cobran cada día firman en la hoja semanal, que no empieza antes del inicio", () => {
    const d = datosTrabajadorHoja(
      { ...base, pago_cuando: "cada_dia" },
      { formaPago: "dia", tarifa: 350, cantidad: 1, fechaPago: "2026-10-24" },
      "2026-10-24",
    );
    expect(d.firmaSemanal).toBe(true);
    expect(d.semanaFirma).toBe("24 al 25 de octubre de 2026");
  });
});

describe("guías", () => {
  it("cada apartado del menú tiene al menos 4 pasos", () => {
    expect(Object.keys(GUIAS)).toHaveLength(8);
    for (const g of Object.values(GUIAS)) expect(g.pasos.length).toBeGreaterThanOrEqual(4);
  });
});
