import { IconoCalendario, IconoPalomita } from "./Iconos";

/** Estado vacío con icono, título, explicación y, si hace falta, una acción. */
export function EstadoVacio({
  titulo,
  texto,
  tono,
  children,
}: {
  titulo: string;
  texto?: React.ReactNode;
  /** "ok": todo al día (palomita verde). */
  tono?: "ok";
  children?: React.ReactNode;
}) {
  return (
    <div className={`vacio${tono ? ` ${tono}` : ""}`}>
      <span className="icono-vacio">{tono === "ok" ? <IconoPalomita /> : <IconoCalendario />}</span>
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}
