// Datos del patrón que salen en recibos, hojas semanales y constancias.
// Se configuran con variables de entorno públicas (ver .env.example).

export const NEGOCIO = {
  nombre: process.env.NEXT_PUBLIC_PATRON_NOMBRE || "Restaurante Los Curros",
  rfc: process.env.NEXT_PUBLIC_PATRON_RFC || null,
  registroPatronal: process.env.NEXT_PUBLIC_REGISTRO_PATRONAL || null,
  domicilio: process.env.NEXT_PUBLIC_DOMICILIO_NEGOCIO || "Tamuín, S.L.P.",
};

/** Texto de la alimentación como prestación, igual en todos los documentos. */
export const TEXTO_ALIMENTACION = "Alimentación durante la jornada, sin costo para el trabajador";
export const NOTA_ALIMENTACION_MINIMO =
  "La alimentación sin costo se registra como parte de la compensación del trabajador (prestación en especie).";
