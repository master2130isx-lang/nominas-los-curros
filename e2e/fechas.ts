import { hoy, semanaDe, sumarDias } from "../src/lib/fechas";

export const HOY = hoy();
/** El sábado más reciente que ya pasó (o hoy si es sábado): día de pago de Rosa. */
export const SABADO = (() => {
  const dow = new Date(`${HOY}T12:00:00Z`).getUTCDay(); // 0 domingo … 6 sábado
  return sumarDias(HOY, -((dow + 1) % 7));
})();
/** Lunes de la semana pasada. */
export const LUNES_PASADO = sumarDias(semanaDe(HOY).inicio, -7);
export { sumarDias };
