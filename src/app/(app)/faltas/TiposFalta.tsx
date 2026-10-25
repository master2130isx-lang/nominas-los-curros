"use client";

import { PastillaFalta } from "@/componentes/PastillaFalta";
import { TIPOS_FALTA, type TipoFalta } from "@/lib/tipos";

const ORDEN: TipoFalta[] = ["sin_aviso", "sin_goce", "justificada"];

/**
 * Tarjetas de radio para escoger el tipo de falta, con el color de su pastilla.
 * Sin opción preseleccionada. El texto del descuento solo se muestra a los de
 * semana fija (a los demás solo se les deja de pagar lo que no trabajaron).
 */
export function TiposFalta({
  valor,
  alCambiar,
  semanaFija,
  leyenda,
  nombre = "tipo",
}: {
  valor: TipoFalta | null;
  alCambiar: (t: TipoFalta) => void;
  semanaFija: boolean;
  leyenda: string;
  nombre?: string;
}) {
  return (
    <fieldset className="tipos-falta">
      <legend>{leyenda}</legend>
      {ORDEN.map((t, i) => (
        <label key={t} className={`tipo-falta ${t}`}>
          <input
            type="radio"
            name={nombre}
            value={t}
            checked={valor === t}
            onChange={() => alCambiar(t)}
            required
            data-foco-inicial={(valor ? valor === t : i === 0) ? "" : undefined}
          />
          <span className="marca-radio" aria-hidden="true" />
          <span className="textos">
            <strong>{TIPOS_FALTA[t].nombre}</strong>
            <span className="ayuda">{TIPOS_FALTA[t].ayuda}</span>
            {semanaFija && <span className="descuento">{TIPOS_FALTA[t].descuento}</span>}
          </span>
          <span className="muestra" aria-hidden="true">
            <PastillaFalta tipo={t} fraccion={1} corta />
          </span>
        </label>
      ))}
    </fieldset>
  );
}
