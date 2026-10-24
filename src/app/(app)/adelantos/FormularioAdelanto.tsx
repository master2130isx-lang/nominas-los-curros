"use client";

import { useActionState, useEffect, useRef } from "react";
import type { EstadoFormulario } from "../recibos/acciones";
import { registrarAdelanto } from "./acciones";

export function FormularioAdelanto({ trabajadores, hoy }: { trabajadores: { id: string; nombre: string }[]; hoy: string }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(registrarAdelanto, { error: null });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!enviando && estado.error === null) ref.current?.reset();
  }, [enviando, estado]);
  return (
    <form ref={ref} action={accion} className="caja relleno formulario">
      <h2>Registrar adelanto</h2>
      <div className="rejilla-2">
        <div className="campo">
          <label htmlFor="trabajador">Trabajador</label>
          <select id="trabajador" name="trabajador" required defaultValue="">
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
          <label htmlFor="monto">Monto (MXN)</label>
          <input id="monto" name="monto" type="number" inputMode="decimal" min="1" step="0.5" required />
        </div>
        <div className="campo">
          <label htmlFor="fecha">Fecha</label>
          <input id="fecha" name="fecha" type="date" defaultValue={hoy} required />
        </div>
        <div className="campo">
          <label htmlFor="descripcion">Cómo se va a descontar</label>
          <input id="descripcion" name="descripcion" type="text" placeholder="Por ejemplo: en dos semanas" />
        </div>
      </div>
      {estado.error && <p className="alerta">{estado.error}</p>}
      <div>
        <button type="submit" className="boton primario" disabled={enviando}>
          Guardar adelanto
        </button>
      </div>
    </form>
  );
}
