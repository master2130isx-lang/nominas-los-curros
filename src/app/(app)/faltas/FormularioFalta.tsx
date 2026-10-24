"use client";

import { useActionState, useEffect, useRef } from "react";
import { TIPOS_FALTA, type TipoFalta } from "@/lib/tipos";
import { anotarFalta, type EstadoFalta } from "./acciones";

export function FormularioFalta({
  trabajadores,
  hoy,
  inicial,
}: {
  trabajadores: { id: string; nombre: string }[];
  hoy: string;
  inicial?: string;
}) {
  const [estado, accion, enviando] = useActionState<EstadoFalta, FormData>(anotarFalta, { error: null, ok: false });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);
  return (
    <form ref={ref} action={accion} className="caja relleno formulario">
      <h2>Anotar una falta</h2>
      <div className="rejilla-2">
        <div className="campo">
          <label htmlFor="trabajador_id">Trabajador</label>
          <select id="trabajador_id" name="trabajador_id" required defaultValue={inicial ?? ""}>
            <option value="" disabled>
              Escoge…
            </option>
            {trabajadores.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="fecha">Día que faltó</label>
          <input id="fecha" name="fecha" type="date" defaultValue={hoy} max={hoy} required />
        </div>
        <div className="campo">
          <label htmlFor="tipo">Tipo de falta</label>
          <select id="tipo" name="tipo" defaultValue="sin_aviso">
            {(Object.keys(TIPOS_FALTA) as TipoFalta[]).map((t) => (
              <option key={t} value={t}>
                {TIPOS_FALTA[t].nombre} · {TIPOS_FALTA[t].descuenta ? "se descuenta" : "no se descuenta"}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="nota">
            Motivo <span className="ayuda">· opcional, sale en el recibo</span>
          </label>
          <input id="nota" name="nota" type="text" maxLength={120} />
        </div>
      </div>
      <label className="casilla" style={{ alignSelf: "flex-start" }}>
        <input type="checkbox" name="media" />
        Solo medio día (llegó tarde o se fue a medio turno)
      </label>
      {estado.error && <p className="alerta">{estado.error}</p>}
      {estado.ok && <p className="alerta info">Falta anotada.</p>}
      <div>
        <button type="submit" className="boton primario" disabled={enviando}>
          {enviando ? "Anotando…" : "Anotar falta"}
        </button>
      </div>
    </form>
  );
}
