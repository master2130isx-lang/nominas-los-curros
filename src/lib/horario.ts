// Horario de entrada y salida. Se guarda como texto ("7:00 a 15:00") junto con
// las horas por día que salen de él.

/** "HH:MM" en 24 horas. */
export interface Horario {
  entrada: string;
  salida: string;
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function deMinutos(min: number): string {
  return `${dosDigitos(Math.floor(min / 60) % 24)}:${dosDigitos(min % 60)}`;
}

/** Horas entre la entrada y la salida; si sale "antes" de entrar, es que sale al día siguiente. */
export function horasEntre(entrada: string, salida: string): number {
  let minutos = aMinutos(salida) - aMinutos(entrada);
  if (minutos <= 0) minutos += 24 * 60;
  return Math.round((minutos / 60) * 100) / 100;
}

/** "7:00 a 15:00" */
export function textoHorario({ entrada, salida }: Horario): string {
  const corto = (hhmm: string) => hhmm.replace(/^0(\d)/, "$1");
  return `${corto(entrada)} a ${corto(salida)}`;
}

/**
 * Lee el horario que se escribió a mano ("7:00 - 3:00", "8am a 3pm", "de 6 a 8am").
 * Si la salida queda antes que la entrada y es de mañana, se entiende de la tarde
 * (en el restaurante nadie entra a las 7 y sale a las 3 de la madrugada).
 */
export function leerHorario(texto: string | null | undefined): Horario | null {
  if (!texto) return null;
  const limpio = texto.toLowerCase().replace(/\s+/g, " ");
  const hora = String.raw`(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.?\s?m\.?|p\.?\s?m\.?)?`;
  const m = limpio.match(new RegExp(`${hora}\\s*(?:-|–|a|al|hasta)\\s*${hora}`));
  if (!m) return null;
  const convertir = (h: string, min: string | undefined, sufijo: string | undefined, otroSufijo?: string) => {
    let horas = Number(h);
    const s = (sufijo ?? otroSufijo ?? "").replace(/[.\s]/g, "");
    if (s === "pm" && horas < 12) horas += 12;
    if (s === "am" && horas === 12) horas = 0;
    return horas * 60 + Number(min ?? 0);
  };
  const entrada = convertir(m[1], m[2], m[3]);
  let salida = convertir(m[4], m[5], m[6]);
  if (entrada > 24 * 60 || salida > 24 * 60) return null;
  if (salida <= entrada && !m[6] && salida + 12 * 60 > entrada && salida < 12 * 60) salida += 12 * 60;
  return { entrada: deMinutos(entrada), salida: deMinutos(salida) };
}
