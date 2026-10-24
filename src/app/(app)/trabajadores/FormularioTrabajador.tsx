"use client";

import { useActionState, useState } from "react";
import { DIAS_SEMANA } from "@/lib/programa";
import { FORMAS_PAGO, TIPOS_TRABAJADOR, type PagoCuando, type Trabajador } from "@/lib/tipos";
import type { EstadoFormulario } from "../recibos/acciones";
import { guardarTrabajador } from "./acciones";

export function FormularioTrabajador({ trabajador }: { trabajador?: Trabajador }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarTrabajador, { error: null });
  const t = trabajador;
  const [pagoCuando, setPagoCuando] = useState<PagoCuando>(t?.pago_cuando ?? "cada_dia");
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
          <label htmlFor="pago_cuando">¿Cuándo se le paga?</label>
          <select id="pago_cuando" name="pago_cuando" value={pagoCuando} onChange={(e) => setPagoCuando(e.target.value as PagoCuando)}>
            <option value="dia_semana">Un día fijo de la semana</option>
            <option value="cada_dia">Cada día que trabaja</option>
            <option value="al_terminar">Al terminar su trabajo</option>
          </select>
        </div>
        {pagoCuando === "dia_semana" ? (
          <div className="campo">
            <label htmlFor="pago_dia_semana">Día en que cobra</label>
            <select id="pago_dia_semana" name="pago_dia_semana" defaultValue={t?.pago_dia_semana ?? 6} required>
              {DIAS_SEMANA.map((n, i) => (
                <option key={n} value={i + 1}>
                  {n.charAt(0).toUpperCase() + n.slice(1)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div />
        )}
        <fieldset className="campo dias-trabajo">
          <legend>
            Días que trabaja <span className="ayuda">· así sabemos a quién le toca cobrar cada día</span>
          </legend>
          <div className="dias">
            {DIAS_SEMANA.map((n, i) => (
              <label key={n} className="casilla">
                <input type="checkbox" name="dias_trabajo" value={i + 1} defaultChecked={t?.dias_trabajo.includes(i + 1)} />
                {n.charAt(0).toUpperCase() + n.slice(1, 3)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="campo">
          <label htmlFor="horario">
            Horario <span className="ayuda">· opcional, ej. 7am a 2pm</span>
          </label>
          <input id="horario" name="horario" type="text" defaultValue={t?.horario ?? ""} />
        </div>
        <div className="campo">
          <label htmlFor="horas_dia">
            Horas por día pactadas <span className="ayuda">· menos de 8 es jornada reducida</span>
          </label>
          <input
            id="horas_dia"
            name="horas_dia"
            type="number"
            inputMode="decimal"
            min="0.5"
            max="24"
            step="0.5"
            defaultValue={t?.horas_dia ?? ""}
            placeholder="8"
          />
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
