// Errores de Supabase/Postgres en palabras del negocio. Nunca se muestra al usuario
// el mensaje técnico de la base de datos: solo los que escribimos nosotros en las
// funciones SQL (raise exception, código P0001), que ya están en español.

export interface ErrorBD {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

const GENERICO = "No se pudo guardar. Intenta de nuevo y, si sigue pasando, avísale al administrador.";

/** Mensajes por restricción (nombre de la constraint de Postgres). */
const RESTRICCIONES: Record<string, string> = {
  faltas_trabajador_id_fecha_key: "Ya hay una falta anotada ese día para este trabajador.",
  faltas_fraccion_check: "La falta solo puede ser de día completo o de medio día.",
  trabajadores_nombre_check: "Escribe el nombre.",
  trabajadores_tarifa_check: "La tarifa no puede ser negativa.",
  trabajadores_pasaje_check: "El pasaje no puede ser negativo.",
  trabajadores_dia_de_pago_check: "Escoge qué día de la semana cobra.",
  trabajadores_horas_dia_check: "Las horas por día deben estar entre 0 y 24.",
  trabajadores_dias_trabajo_check: "Los días de trabajo no son válidos.",
  adelantos_monto_check: "El monto debe ser mayor a cero.",
};

function restriccion(e: ErrorBD): string | undefined {
  const texto = `${e.message ?? ""} ${e.details ?? ""}`;
  return Object.keys(RESTRICCIONES).find((nombre) => texto.includes(nombre));
}

/** Convierte un error de Supabase en un mensaje en español para la pantalla. */
export function traducirError(e: ErrorBD | null | undefined, porDefecto = GENERICO): string {
  if (!e) return porDefecto;
  const nombre = restriccion(e);
  if (nombre) return RESTRICCIONES[nombre];
  switch (e.code) {
    case "P0001": // raise exception de nuestras funciones: el texto ya es para el usuario
      return e.message?.trim() || porDefecto;
    case "23505":
      return "Ese registro ya existe.";
    case "23503":
      return "Falta un dato relacionado (el trabajador o el recibo ya no existe).";
    case "23514":
    case "23502":
    case "22P02":
    case "22007":
    case "22008":
      return "Algún dato no es válido. Revisa el formulario.";
    case "42501":
      return "No tienes permiso para hacer este cambio.";
    case "PGRST116":
      return "No se encontró el registro.";
    case "PGRST301":
    case "PGRST302":
      return "Tu sesión expiró. Vuelve a entrar.";
  }
  if (/fetch failed|network|timeout/i.test(e.message ?? "")) {
    return "No hay conexión con la base de datos. Revisa el internet e intenta de nuevo.";
  }
  return porDefecto;
}

/** Errores de Supabase Storage al subir la foto de un recibo o de una constancia. */
export function traducirErrorSubida(mensaje: string | undefined): string {
  const m = mensaje ?? "";
  if (/too large|exceeded|maximum allowed size/i.test(m)) return "La foto pesa más de 10 MB. Toma otra con menos resolución.";
  if (/mime|content type|not supported/i.test(m)) return "Ese tipo de archivo no se acepta. Sube una foto (JPG, PNG, HEIC) o un PDF.";
  if (/row-level security|unauthorized|not allowed|403/i.test(m)) return "No tienes permiso para subir fotos.";
  if (/already exists|duplicate/i.test(m)) return "Esa foto ya se había subido. Intenta de nuevo.";
  if (/fetch|network|timeout/i.test(m)) return "No hay conexión. Revisa el internet e intenta de nuevo.";
  return "No se pudo subir la foto. Intenta de nuevo.";
}
