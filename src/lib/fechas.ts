const ZONA = "America/Mexico_City";

/** Fecha de hoy en Tamuín (hora del centro de México), como YYYY-MM-DD. */
export function hoy(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

export function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}

/** Semana de lunes a domingo que contiene la fecha. */
export function semanaDe(iso: string): { inicio: string; fin: string } {
  const [a, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay(); // 0 = domingo
  const desdeLunes = (dow + 6) % 7;
  const inicio = sumarDias(iso, -desdeLunes);
  return { inicio, fin: sumarDias(inicio, 6) };
}

export function esFecha(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

/** Día en que se empezó a usar la plataforma: nada anterior se muestra ni se captura. */
export const FECHA_IMPLEMENTACION = "2026-10-24";

/**
 * Fecha de inicio vigente (solo en el servidor). La variable FECHA_INICIO permite
 * moverla, por ejemplo en las pruebas; si no existe o no es válida, se usa
 * FECHA_IMPLEMENTACION.
 */
export function fechaInicio(): string {
  const f = typeof process !== "undefined" ? process.env.FECHA_INICIO : undefined;
  return esFecha(f) ? f : FECHA_IMPLEMENTACION;
}

/** La fecha, pero nunca antes del inicio. */
export function desdeInicio(fecha: string, inicio = fechaInicio()): string {
  return fecha < inicio ? inicio : fecha;
}

/** Mensaje de error si la fecha es anterior al inicio de la plataforma; null si está bien. */
export function errorAntesDeInicio(fecha: string, inicio = fechaInicio()): string | null {
  if (fecha >= inicio) return null;
  const [a, m, d] = inicio.split("-").map(Number);
  return `La plataforma empezó el ${d}/${String(m).padStart(2, "0")}/${a}; no se capturan días anteriores.`;
}
