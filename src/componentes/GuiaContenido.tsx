"use client";

import { GUIAS, type Apartado } from "@/lib/guias";
import { Panel } from "./Panel";

/** Panel con los pasos numerados de un apartado; se descarga hasta que alguien abre la guía. */
export default function GuiaContenido({
  apartado,
  titulo,
  retorno,
  alCerrar,
}: {
  apartado: Apartado;
  titulo: string;
  retorno: React.RefObject<HTMLElement | null>;
  alCerrar: () => void;
}) {
  const guia = GUIAS[apartado];
  return (
    <Panel abierto alCerrar={alCerrar} retorno={retorno} titulo={`Cómo usar ${titulo}`} descripcion="Pasos para el encargado">
      <div className="panel-cuerpo">
        <ol className="pasos">
          {guia.pasos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        {guia.consejo && <p className="alerta info">{guia.consejo}</p>}
      </div>
      <div className="panel-pie">
        <button type="button" className="boton primario" onClick={alCerrar} data-foco-inicial="">
          Entendido
        </button>
      </div>
    </Panel>
  );
}
