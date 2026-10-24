import type { Trabajador } from "./tipos";

// Referencias de la Ley Federal del Trabajo y del salario mínimo que usa la
// plataforma. No sustituyen la opinión del contador.

/** Salario mínimo general 2026 (Tamuín no es zona fronteriza). */
export const SALARIO_MINIMO_DIARIO = 315.04;
export const JORNADA_COMPLETA_HORAS = 8;
export const SALARIO_MINIMO_HORA = Math.round((SALARIO_MINIMO_DIARIO / JORNADA_COMPLETA_HORAS) * 100) / 100;

const redondear = (n: number) => Math.round(n * 100) / 100;

type Datos = Pick<Trabajador, "forma_pago" | "tarifa" | "dias_trabajo" | "horas_dia">;

/** Semana completa: 6 días de trabajo y 1 de descanso pagado (art. 69). */
export function esSemanaCompleta(t: Datos): boolean {
  return t.forma_pago === "semana" && t.dias_trabajo.length === 6;
}

/** Salario diario de los de semana fija: semanal ÷ 7 si tiene descanso, o ÷ días pactados. */
export function salarioDiario(t: Datos): number | null {
  if (t.forma_pago !== "semana" || t.dias_trabajo.length === 0) return null;
  return redondear(t.tarifa / (esSemanaCompleta(t) ? 7 : t.dias_trabajo.length));
}

/** Lo que se descuenta por una falta completa sin aviso (semanal ÷ días pactados). */
export function descuentoPorFalta(t: Datos): number | null {
  if (t.forma_pago !== "semana" || t.dias_trabajo.length === 0) return null;
  return redondear(t.tarifa / t.dias_trabajo.length);
}

export interface ComparacionMinimo {
  /** Lo que gana por hora con la jornada pactada. */
  porHora: number;
  /** Lo que marcaría el mínimo por el mismo periodo y jornada. */
  minimo: number;
  /** Lo que gana por ese mismo periodo. */
  pago: number;
  periodo: string;
  arriba: boolean;
}

/** Compara el pago con el salario mínimo proporcional a la jornada pactada. */
export function compararConMinimo(t: Datos): ComparacionMinimo | null {
  if (t.forma_pago === "tarea") return null;
  if (t.forma_pago === "hora") {
    return { porHora: t.tarifa, minimo: SALARIO_MINIMO_HORA, pago: t.tarifa, periodo: "hora", arriba: t.tarifa >= SALARIO_MINIMO_HORA };
  }
  const horas = t.horas_dia ?? (esSemanaCompleta(t) ? JORNADA_COMPLETA_HORAS : null);
  if (!horas) return null;
  if (t.forma_pago === "semana") {
    const dias = t.dias_trabajo.length;
    if (!dias) return null;
    // Con descanso semanal, el mínimo también paga el séptimo día.
    const diasPagados = esSemanaCompleta(t) ? 7 : dias;
    const minimo = redondear((SALARIO_MINIMO_DIARIO * horas * diasPagados) / JORNADA_COMPLETA_HORAS);
    return { porHora: redondear(t.tarifa / (horas * dias)), minimo, pago: t.tarifa, periodo: "semana", arriba: t.tarifa >= minimo };
  }
  const minimo = redondear((SALARIO_MINIMO_DIARIO * horas) / JORNADA_COMPLETA_HORAS);
  const periodo = t.forma_pago === "turno" ? "turno" : "día";
  return { porHora: redondear(t.tarifa / horas), minimo, pago: t.tarifa, periodo, arriba: t.tarifa >= minimo };
}
