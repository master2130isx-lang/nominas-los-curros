import type { EstadoRecibo as Estado } from "@/lib/tipos";

export function EstadoRecibo({ estado }: { estado: Estado }) {
  if (estado === "firmado") return <span className="pastilla ok">Pagado y firmado</span>;
  if (estado === "sin_firma") return <span className="pastilla error">Pagado, sin foto firmada</span>;
  return <span className="pastilla gris">Cancelado</span>;
}
