import type { TipoFalta } from "@/lib/tipos";

export function PastillaFalta({ tipo, fraccion }: { tipo: TipoFalta; fraccion: number }) {
  const clase = tipo === "sin_aviso" ? "error" : tipo === "sin_goce" ? "aviso" : "gris";
  return (
    <span className={`pastilla ${clase}`}>
      {fraccion < 1 ? "Media falta · " : "Falta · "}
      {tipo === "sin_aviso" ? "sin aviso" : tipo === "sin_goce" ? "sin goce" : "justificada"}
    </span>
  );
}
