"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import type { TipoFalta } from "@/lib/tipos";
import { anotarFalta, borrarFalta, editarFalta, type EstadoFalta } from "./acciones";
import type { FaltaEditable } from "./MarcarFalta";
import { TiposFalta } from "./TiposFalta";

interface Props {
  trabajadorId: string;
  nombre: string;
  fecha: string;
  semanaFija: boolean;
  falta?: FaltaEditable;
  alTerminar: () => void;
  alCancelar: () => void;
}

/** Contenido del panel de falta; se carga hasta que se abre el primer panel. */
export default function FormularioPanel({ trabajadorId, nombre, fecha, semanaFija, falta, alTerminar, alCancelar }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFalta, FormData>(falta ? editarFalta : anotarFalta, {
    error: null,
    ok: false,
  });
  const [tipo, setTipo] = useState<TipoFalta | null>(falta?.tipo ?? null);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const [quitando, iniciarQuitar] = useTransition();
  const [errorQuitar, setErrorQuitar] = useState<string | null>(null);
  const id = useId();
  const terminar = useRef(alTerminar);
  terminar.current = alTerminar;
  const formulario = useRef<HTMLFormElement>(null);

  // Llega después de abrir el panel (se carga aparte): toma el foco al aparecer.
  useEffect(() => {
    formulario.current?.querySelector<HTMLElement>("[data-foco-inicial]")?.focus();
  }, []);

  useEffect(() => {
    if (estado.ok) terminar.current();
  }, [estado]);

  const ocupado = enviando || quitando;
  return (
    <form ref={formulario} action={accion} className="formulario" style={{ gap: 0, minHeight: 0 }} aria-busy={ocupado}>
      {falta ? <input type="hidden" name="id" value={falta.id} /> : null}
      <input type="hidden" name="trabajador_id" value={trabajadorId} />
      <input type="hidden" name="fecha" value={fecha} />
      <div className="panel-cuerpo">
        <TiposFalta valor={tipo} alCambiar={setTipo} semanaFija={semanaFija} leyenda={`Tipo de falta de ${nombre}`} />
        <label className="casilla" style={{ alignSelf: "flex-start" }}>
          <input type="checkbox" name="media" defaultChecked={falta ? falta.fraccion < 1 : false} />
          Solo medio día (llegó tarde o se fue a medio turno)
        </label>
        <div className="campo">
          <label htmlFor={`nota-${id}`}>
            Motivo <span className="ayuda">· opcional, sale en el recibo</span>
          </label>
          <input id={`nota-${id}`} name="nota" type="text" maxLength={120} defaultValue={falta?.nota ?? ""} autoComplete="off" />
        </div>
        {estado.error && (
          <p className="alerta aparece" role="alert">
            {estado.error}
            {estado.recibo && (
              <>
                {" "}
                <Link href={`/recibos/${estado.recibo.id}`}>Ver recibo folio {estado.recibo.folio}</Link>
              </>
            )}
          </p>
        )}
        {errorQuitar && (
          <p className="alerta aparece" role="alert">
            {errorQuitar}
          </p>
        )}
      </div>
      <div className="panel-pie">
        {falta &&
          (confirmarQuitar ? (
            <div className="confirmar-quitar izq">
              <span>¿Quitar esta falta?</span>
              <button
                type="button"
                className="boton chico peligro lleno"
                disabled={ocupado}
                onClick={() =>
                  iniciarQuitar(async () => {
                    const r = await borrarFalta(falta.id);
                    if (r.error) setErrorQuitar(r.error);
                    else terminar.current();
                  })
                }
              >
                {quitando ? "Quitando…" : "Sí, quitar"}
              </button>
              <button type="button" className="boton chico fantasma" onClick={() => setConfirmarQuitar(false)}>
                No
              </button>
            </div>
          ) : (
            <button type="button" className="boton peligro izq" onClick={() => setConfirmarQuitar(true)} disabled={ocupado}>
              Quitar falta
            </button>
          ))}
        <button type="button" className="boton" onClick={alCancelar}>
          Cancelar
        </button>
        <button type="submit" className="boton primario" disabled={!tipo || ocupado} aria-busy={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
