"use client";

import { useActionState } from "react";
import { FORMAS_PAGO, TIPOS_TRABAJADOR, type Trabajador } from "@/lib/tipos";
import type { EstadoFormulario } from "../recibos/acciones";
import { guardarTrabajador } from "./acciones";

export function FormularioTrabajador({ trabajador }: { trabajador?: Trabajador }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarTrabajador, { error: null });
  const t = trabajador;
  return (
    <form action={accion} className="caja relleno formulario" style={{ maxWidth: 760 }}>
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="rejilla-2">
        <div className="campo">
          <label htmlFor="nombre">Nombre completo</label>
          <input id="nombre" name="nombre" type="text" defaultValue={t?.nombre} required />
        </div>
        <div className="campo">
          <label htmlFor="actividad">Qué hace</label>
          <input id="actividad" name="actividad" type="text" defaultValue={t?.actividad ?? ""} placeholder="Cocinera, aseo…" />
        </div>
        <div className="campo">
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" defaultValue={t?.tipo ?? "informal_turno"}>
            {Object.entries(TIPOS_TRABAJADOR).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="forma_pago">Forma de pago</label>
          <select id="forma_pago" name="forma_pago" defaultValue={t?.forma_pago ?? "dia"}>
            {Object.entries(FORMAS_PAGO).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="tarifa">Tarifa acordada (MXN)</label>
          <input id="tarifa" name="tarifa" type="number" inputMode="decimal" min="0" step="0.5" defaultValue={t?.tarifa} required />
        </div>
        <div className="campo">
          <label htmlFor="pasaje">
            Apoyo de pasaje (MXN) <span className="ayuda">· por día si se paga por día o turno</span>
          </label>
          <input id="pasaje" name="pasaje" type="number" inputMode="decimal" min="0" step="0.5" defaultValue={t?.pasaje ?? 0} />
        </div>
        <div className="campo">
          <label htmlFor="dia_pago">Día de pago</label>
          <input id="dia_pago" name="dia_pago" type="text" defaultValue={t?.dia_pago ?? ""} placeholder="Sábado, diario…" />
        </div>
        <div className="campo">
          <label htmlFor="horario">Días u horario habitual</label>
          <input id="horario" name="horario" type="text" defaultValue={t?.horario ?? ""} />
        </div>
        <div className="campo">
          <label htmlFor="telefono">Teléfono</label>
          <input id="telefono" name="telefono" type="tel" defaultValue={t?.telefono ?? ""} />
        </div>
        <div className="campo">
          <label htmlFor="curp">
            CURP <span className="ayuda">· opcional</span>
          </label>
          <input id="curp" name="curp" type="text" maxLength={18} defaultValue={t?.curp ?? ""} />
        </div>
        <div className="campo">
          <label htmlFor="fecha_ingreso">Fecha en que empezó</label>
          <input id="fecha_ingreso" name="fecha_ingreso" type="date" defaultValue={t?.fecha_ingreso ?? ""} />
        </div>
      </div>
      <div className="campo">
        <label htmlFor="notas">Notas</label>
        <textarea id="notas" name="notas" defaultValue={t?.notas ?? ""} />
      </div>
      {t && (
        <label className="casilla" style={{ alignSelf: "flex-start" }}>
          <input type="checkbox" name="activo" defaultChecked={t.activo} />
          Sigue trabajando (si lo desmarcas ya no aparece para nuevos pagos)
        </label>
      )}
      {estado.error && <p className="alerta">{estado.error}</p>}
      <div>
        <button type="submit" className="boton primario" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
