"use client";

import { useActionState, useEffect, useRef } from "react";
import { TIPOS_FALTA, type TipoFalta } from "@/lib/tipos";
import { anotarFalta, type EstadoFalta } from "./acciones";

/** Botón "Marcar falta" que se abre en un formulario corto, para un trabajador y un día. */
export function MarcarFalta({ trabajadorId, nombre, fecha }: { trabajadorId: string; nombre: string; fecha: string }) {
  const [estado, accion, enviando] = useActionState<EstadoFalta, FormData>(anotarFalta, { error: null, ok: false });
  const detalles = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (estado.ok && detalles.current) detalles.current.open = false;
  }, [estado]);
  const id = `${trabajadorId}-${fecha}`;
  return (
    <details className="marcar-falta" ref={detalles}>
      <summary className="boton chico">Marcar falta</summary>
      <form action={accion} className="formulario">
        <input type="hidden" name="trabajador_id" value={trabajadorId} />
        <input type="hidden" name="fecha" value={fecha} />
        <fieldset className="campo">
          <legend>¿Qué tipo de falta de {nombre}?</legend>
          {(Object.keys(TIPOS_FALTA) as TipoFalta[]).map((t, i) => (
            <label key={t} className="opcion">
              <input type="radio" name="tipo" value={t} defaultChecked={i === 0} required />
              <span>
                <strong>{TIPOS_FALTA[t].nombre}</strong>
                <span className="secundario">
                  {TIPOS_FALTA[t].ayuda}. {TIPOS_FALTA[t].descuento}.
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="casilla">
          <input type="checkbox" name="media" />
          Solo medio día (llegó tarde o se fue a medio turno)
        </label>
        <div className="campo">
          <label htmlFor={`nota-${id}`}>
            Motivo <span className="ayuda">· opcional, sale en el recibo</span>
          </label>
          <input id={`nota-${id}`} name="nota" type="text" maxLength={120} />
        </div>
        {estado.error && <p className="alerta">{estado.error}</p>}
        <div>
          <button type="submit" className="boton primario chico" disabled={enviando}>
            {enviando ? "Anotando…" : "Anotar falta"}
          </button>
        </div>
      </form>
    </details>
  );
}
