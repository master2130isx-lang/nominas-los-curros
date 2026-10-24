import { sumarDias } from "./fechas";
import type { Trabajador } from "./tipos";

// Cuándo trabaja y cuándo cobra cada trabajador. Días como en ISO:
// 1 = lunes … 7 = domingo.

export const DIAS_SEMANA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const DIAS_CORTOS = ["L", "M", "M", "J", "V", "S", "D"];

type Programa = Pick<Trabajador, "pago_cuando" | "pago_dia_semana" | "dias_trabajo" | "forma_pago">;

export function diaIso(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

export function trabajaEse(t: Programa, fecha: string): boolean {
  return t.dias_trabajo.includes(diaIso(fecha));
}

/** ¿Le toca recibo ese día? */
export function leTocaCobrar(t: Programa, fecha: string): boolean {
  if (t.pago_cuando === "dia_semana") return t.pago_dia_semana === diaIso(fecha);
  return trabajaEse(t, fecha);
}

/** Periodo que cubre un recibo pagado ese día: la semana que termina ese día, o solo ese día. */
export function periodoSugerido(t: Programa | undefined, fechaPago: string): { inicio: string; fin: string } {
  if (t?.forma_pago === "semana") return { inicio: sumarDias(fechaPago, -6), fin: fechaPago };
  return { inicio: fechaPago, fin: fechaPago };
}

/** Lo normal que se paga en un recibo; null cuando hay que preguntarlo (horas). */
export function cantidadSugerida(t: Programa): number | null {
  return t.forma_pago === "hora" ? null : 1;
}

export interface GrupoPago {
  clave: string;
  orden: number;
  nombre: string;
}

export function grupoPago(t: Programa): GrupoPago {
  if (t.pago_cuando === "dia_semana" && t.pago_dia_semana) {
    const n = DIAS_SEMANA[t.pago_dia_semana - 1];
    return { clave: `d${t.pago_dia_semana}`, orden: t.pago_dia_semana, nombre: `Cobran el ${n}` };
  }
  if (t.pago_cuando === "al_terminar") return { clave: "tarea", orden: 9, nombre: "Cobran al terminar su trabajo" };
  return { clave: "diario", orden: 8, nombre: "Cobran cada día que trabajan" };
}

export function textoDiaPago(t: Programa): string {
  if (t.pago_cuando === "dia_semana" && t.pago_dia_semana) {
    const n = DIAS_SEMANA[t.pago_dia_semana - 1];
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  return t.pago_cuando === "al_terminar" ? "Al terminar" : "Cada día que trabaja";
}

export function textoDias(dias: number[]): string {
  if (dias.length === 0) return "Sin días marcados";
  if (dias.length === 7) return "Todos los días";
  return [...dias].sort().map((d) => DIAS_SEMANA[d - 1].slice(0, 3)).join(", ");
}

interface PeriodoRecibo {
  trabajador_id: string;
  periodo_inicio: string;
  periodo_fin: string;
  fecha_pago: string;
  estado: string;
}

/** ¿Ya hay un recibo vigente que cubra ese día para ese trabajador? */
export function reciboQueCubre<R extends PeriodoRecibo>(recibos: R[], trabajadorId: string, fecha: string): R | undefined {
  return recibos.find(
    (r) =>
      r.trabajador_id === trabajadorId &&
      r.estado !== "cancelado" &&
      ((r.periodo_inicio <= fecha && fecha <= r.periodo_fin) || r.fecha_pago === fecha),
  );
}

/**
 * Días anteriores (hasta `dias` atrás) en que le tocaba cobrar y no tiene recibo.
 * No cuenta días antes de `alta` (cuando se dio de alta en la plataforma).
 */
export function pendientesAnteriores<T extends Programa & { id: string; alta?: string }>(
  trabajadores: T[],
  recibos: PeriodoRecibo[],
  fecha: string,
  dias = 7,
): { trabajador: T; fecha: string }[] {
  const lista: { trabajador: T; fecha: string }[] = [];
  for (let i = 1; i <= dias; i++) {
    const dia = sumarDias(fecha, -i);
    for (const t of trabajadores) {
      if (t.alta && dia < t.alta) continue;
      if (leTocaCobrar(t, dia) && !reciboQueCubre(recibos, t.id, dia)) lista.push({ trabajador: t, fecha: dia });
    }
  }
  return lista;
}
