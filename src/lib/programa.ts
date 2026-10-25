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

export function trabajaEse(t: Pick<Trabajador, "dias_trabajo">, fecha: string): boolean {
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

interface FaltaDia {
  trabajador_id: string;
  fecha: string;
  fraccion: number;
  tipo: string;
}

export function faltaDe<F extends FaltaDia>(faltas: F[], trabajadorId: string, fecha: string): F | undefined {
  return faltas.find((f) => f.trabajador_id === trabajadorId && f.fecha === fecha);
}

/** ¿Faltó el día completo? A los que cobran por día ya no les toca recibo ese día. */
function faltoCompleto(t: Programa & { id: string }, faltas: FaltaDia[], fecha: string): boolean {
  return t.pago_cuando !== "dia_semana" && (faltaDe(faltas, t.id, fecha)?.fraccion ?? 0) >= 1;
}

/** ¿Le toca recibo ese día, contando las faltas? */
export function cobraEseDia(t: Programa & { id: string }, faltas: FaltaDia[], fecha: string): boolean {
  return leTocaCobrar(t, fecha) && !faltoCompleto(t, faltas, fecha);
}

/** Faltas sin aviso por trabajador en los 30 días que terminan en `fecha` (LFT art. 47 fr. X). */
export function faltasSinAviso30(faltas: FaltaDia[], fecha: string): Map<string, number> {
  const desde = sumarDias(fecha, -29);
  const cuenta = new Map<string, number>();
  for (const f of faltas) {
    if (f.tipo === "sin_aviso" && f.fecha >= desde && f.fecha <= fecha) {
      cuenta.set(f.trabajador_id, (cuenta.get(f.trabajador_id) ?? 0) + 1);
    }
  }
  return cuenta;
}

/** Cuántos días atrás revisa "Pendientes de días anteriores". */
export const DIAS_PENDIENTES = 14;

/**
 * Días anteriores (hasta `dias` atrás) en que le tocaba cobrar y no tiene recibo
 * ni falta completa. Incluye los días de antes de que se diera de alta en la
 * plataforma (para ponerse al corriente); solo se salta los de antes de `desde`,
 * la fecha en que empezó a trabajar, si se conoce.
 */
export function pendientesAnteriores<T extends Programa & { id: string; desde?: string | null }>(
  trabajadores: T[],
  recibos: PeriodoRecibo[],
  fecha: string,
  faltas: FaltaDia[] = [],
  dias = DIAS_PENDIENTES,
): { trabajador: T; fecha: string }[] {
  const lista: { trabajador: T; fecha: string }[] = [];
  for (let i = 1; i <= dias; i++) {
    const dia = sumarDias(fecha, -i);
    for (const t of trabajadores) {
      if (t.desde && dia < t.desde) continue;
      if (faltoCompleto(t, faltas, dia)) continue;
      if (leTocaCobrar(t, dia) && !reciboQueCubre(recibos, t.id, dia)) lista.push({ trabajador: t, fecha: dia });
    }
  }
  return lista;
}

/** Pendientes agrupados por trabajador (del día más reciente al más viejo). */
export function agruparPendientes<T extends { id: string }>(
  pendientes: { trabajador: T; fecha: string }[],
): { trabajador: T; fechas: string[] }[] {
  const grupos = new Map<string, { trabajador: T; fechas: string[] }>();
  for (const p of pendientes) {
    const g = grupos.get(p.trabajador.id) ?? { trabajador: p.trabajador, fechas: [] };
    g.fechas.push(p.fecha);
    grupos.set(p.trabajador.id, g);
  }
  return [...grupos.values()];
}

/** Iniciales para el avatar: "Ana Lucía Prueba" → "AP". */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const primera = partes[0].charAt(0);
  const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : partes[0].charAt(1);
  return (primera + ultima).toUpperCase();
}

/** Tono estable del avatar (0-3) según el nombre. */
export function tonoAvatar(nombre: string): number {
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 4;
}
