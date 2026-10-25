"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { FormaPago, TipoFalta } from "@/lib/tipos";
import { anotarFalta, type EstadoFalta } from "./acciones";
import { TiposFalta } from "./TiposFalta";

export function FormularioFalta({
  trabajadores,
  hoy,
  minimo,
  inicial,
}: {
  trabajadores: { id: string; nombre: string; forma_pago: FormaPago }[];
  hoy: string;
  /** Primer día que se puede anotar (inicio de la plataforma). */
  minimo: string;
  inicial?: string;
}) {
  const [estado, accion, enviando] = useActionState<EstadoFalta, FormData>(anotarFalta, { error: null, ok: false });
  const [trabajador, setTrabajador] = useState(inicial ?? "");
  const [tipo, setTipo] = useState<TipoFalta | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) {
      ref.current?.reset();
      setTipo(null);
    }
  }, [estado]);
  const semanaFija = trabajadores.find((t) => t.id === trabajador)?.forma_pago === "semana";

  return (
    <form ref={ref} action={accion} className="caja relleno formulario" aria-labelledby="titulo-anotar">
      <div>
        <h2 id="titulo-anotar">Anotar una falta</h2>
        <p className="ayuda" style={{ margin: "4px 0 0" }}>
          Para varios días o varias personas es más rápido{" "}
          <Link href="/asistencia">Asistencia de la semana</Link>.
        </p>
      </div>
      <div className="rejilla-2">
        <div className="campo">
          <label htmlFor="trabajador_id">Trabajador</label>
          <select
            id="trabajador_id"
            name="trabajador_id"
            required
            value={trabajador}
            onChange={(e) => setTrabajador(e.target.value)}
          >
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
          <input id="fecha" name="fecha" type="date" defaultValue={hoy} min={minimo} max={hoy} required />
        </div>
      </div>
      <TiposFalta valor={tipo} alCambiar={setTipo} semanaFija={semanaFija} leyenda="Tipo de falta" />
      <div className="rejilla-2" style={{ alignItems: "end" }}>
        <label className="casilla" style={{ alignSelf: "end" }}>
          <input type="checkbox" name="media" />
          Solo medio día
        </label>
        <div className="campo">
          <label htmlFor="nota">
            Motivo <span className="ayuda">· opcional, sale en el recibo</span>
          </label>
          <input id="nota" name="nota" type="text" maxLength={120} autoComplete="off" />
        </div>
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
      {estado.ok && (
        <p className="alerta ok aparece" role="status">
          Falta anotada.
        </p>
      )}
      <div>
        <button type="submit" className="boton primario" disabled={enviando || !tipo || !trabajador} aria-busy={enviando}>
          {enviando ? "Anotando…" : "Anotar falta"}
        </button>
      </div>
    </form>
  );
}
