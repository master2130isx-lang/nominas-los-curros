// Cliente de Supabase falso para probar Server Actions sin base de datos.
// Cada consulta (from/rpc) se registra y responde con lo que se le indique.

export interface Llamada {
  tabla?: string;
  rpc?: string;
  args?: unknown;
  operacion: string;
  datos?: unknown;
  filtros: [string, ...unknown[]][];
}

type Respuesta = { data: unknown; error: unknown };
type Responder = (llamada: Llamada) => Respuesta | undefined;

export function supabaseFalso(responder: Responder = () => undefined) {
  const llamadas: Llamada[] = [];

  function consulta(llamada: Llamada) {
    llamadas.push(llamada);
    const resolver = () => Promise.resolve(responder(llamada) ?? { data: null, error: null });
    const builder: Record<string, unknown> = {
      then: (ok: (r: Respuesta) => unknown, mal?: (e: unknown) => unknown) => resolver().then(ok, mal),
    };
    for (const op of ["select", "insert", "update", "delete", "upsert"]) {
      builder[op] = (datos?: unknown) => {
        if (op !== "select" || llamada.operacion === "select") llamada.operacion = op;
        if (op !== "select") llamada.datos = datos;
        return builder;
      };
    }
    for (const f of ["eq", "neq", "is", "lte", "gte", "lt", "gt", "in", "order", "limit", "range", "returns"]) {
      builder[f] = (...args: unknown[]) => {
        llamada.filtros.push([f, ...args]);
        return builder;
      };
    }
    builder.maybeSingle = () => resolver();
    builder.single = () => resolver();
    return builder;
  }

  const cliente = {
    from: (tabla: string) => consulta({ tabla, operacion: "select", filtros: [] }),
    rpc: (rpc: string, args?: unknown) => consulta({ rpc, args, operacion: "rpc", filtros: [] }),
  };
  return { cliente, llamadas };
}
