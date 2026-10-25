import type { TipoFalta } from "@/lib/tipos";

export const CLASE_FALTA: Record<TipoFalta, string> = { sin_aviso: "error", sin_goce: "aviso", justificada: "gris" };
export const TEXTO_FALTA: Record<TipoFalta, string> = { sin_aviso: "sin aviso", sin_goce: "sin goce", justificada: "justificada" };

export function PastillaFalta({ tipo, fraccion, corta }: { tipo: TipoFalta; fraccion: number; corta?: boolean }) {
  return (
    <span className={`pastilla ${CLASE_FALTA[tipo]}`}>
      {corta ? "" : fraccion < 1 ? "Media falta · " : "Falta · "}
      {corta ? TEXTO_FALTA[tipo].charAt(0).toUpperCase() + TEXTO_FALTA[tipo].slice(1) : TEXTO_FALTA[tipo]}
    </span>
  );
}
