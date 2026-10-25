const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ¿Es un identificador de la base de datos (uuid)? */
export function esUuid(s: unknown): s is string {
  return typeof s === "string" && UUID.test(s);
}

/**
 * Filtro ?trabajador= de las listas: sin filtro, válido, o inválido (se avisa en
 * pantalla en lugar de mostrar una lista vacía).
 */
export function leerFiltroTrabajador(valor: string | undefined): { id?: string; invalido: boolean } {
  if (!valor) return { invalido: false };
  return esUuid(valor) ? { id: valor, invalido: false } : { invalido: true };
}
