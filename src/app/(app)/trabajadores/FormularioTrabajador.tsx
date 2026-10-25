"use client";

import { useActionState, useState } from "react";
import { cantidad } from "@/lib/formato";
import { horasEntre, leerHorario } from "@/lib/horario";
import { DIAS_SEMANA } from "@/lib/programa";
import { FORMAS_PAGO, TIPOS_TRABAJADOR, type PagoCuando, type Trabajador } from "@/lib/tipos";
import type { EstadoFormulario } from "../recibos/acciones";
import { guardarTrabajador } from "./acciones";

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function FormularioTrabajador({ trabajador }: { trabajador?: Trabajador }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarTrabajador, { error: null });
  const t = trabajador;
  const [pagoCuando, setPagoCuando] = useState<PagoCuando>(t?.pago_cuando ?? "cada_dia");
  const leido = leerHorario(t?.horario);
  const [entrada, setEntrada] = useState(leido?.entrada ?? "");
  const [salida, setSalida] = useState(leido?.salida ?? "");
  const horas = entrada && salida ? horasEntre(entrada, salida) : null;
  // Un horario viejo escrito a mano que no se pudo leer se conserva mientras no se escojan horas.
  const horarioAnterior = t?.horario && !leido ? t.horario : null;

  return (
    <form action={accion} className="caja relleno formulario formulario-trabajador">
      {t && <input type="hidden" name="id" value={t.id} />}

      <fieldset className="grupo">
        <legend>Datos</legend>
        <div className="rejilla-dos">
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
            <label htmlFor="fecha_ingreso">Fecha en que empezó</label>
            <input id="fecha_ingreso" name="fecha_ingreso" type="date" defaultValue={t?.fecha_ingreso ?? ""} />
          </div>
          <div className="campo">
            <label htmlFor="telefono">
              Teléfono <span className="ayuda">· opcional</span>
            </label>
            <input id="telefono" name="telefono" type="tel" defaultValue={t?.telefono ?? ""} />
          </div>
          <div className="campo">
            <label htmlFor="curp">
              CURP <span className="ayuda">· opcional</span>
            </label>
            <input id="curp" name="curp" type="text" maxLength={18} defaultValue={t?.curp ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>Pago</legend>
        <div className="rejilla-tres">
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
              Apoyo de pasaje (MXN) <span className="ayuda">· opcional</span>
            </label>
            <input id="pasaje" name="pasaje" type="number" inputMode="decimal" min="0" step="0.5" defaultValue={t?.pasaje ?? 0} />
          </div>
        </div>
        <div className="rejilla-dos">
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
                    {mayuscula(n)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="nota-campo">
              {pagoCuando === "cada_dia"
                ? "Le toca cobrar cada día que marques en Horario."
                : "Le toca cobrar el día que termina su trabajo, según los días que marques en Horario."}
            </p>
          )}
        </div>
        <p className="ayuda" style={{ margin: 0 }}>
          El apoyo de pasaje se suma por cada día o turno si cobra por día o turno; si no, una vez por recibo.
        </p>
      </fieldset>

      <fieldset className="grupo">
        <legend>Horario</legend>
        <div className="campo">
          <span className="etiqueta">
            Días que trabaja <span className="ayuda">· así sabemos a quién le toca cobrar cada día</span>
          </span>
          <div className="dias">
            {DIAS_SEMANA.map((n, i) => (
              <label key={n} className="dia">
                <input type="checkbox" name="dias_trabajo" value={i + 1} defaultChecked={t?.dias_trabajo.includes(i + 1)} />
                <span>{mayuscula(n.slice(0, 3))}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="rejilla-tres">
          <div className="campo">
            <label htmlFor="hora_entrada">Entra a las</label>
            <input id="hora_entrada" name="hora_entrada" type="time" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="hora_salida">Sale a las</label>
            <input id="hora_salida" name="hora_salida" type="time" value={salida} onChange={(e) => setSalida(e.target.value)} />
          </div>
          <div className="campo">
            <span className="etiqueta">Horas por día</span>
            <div className="horas-calculadas" aria-live="polite">
              {horas === null ? (
                <span className="ayuda">Escoge la entrada y la salida</span>
              ) : entrada === salida ? (
                <span className="pastilla error">La salida debe ser distinta a la entrada</span>
              ) : (
                <>
                  <strong>{cantidad(horas)} h</strong>
                  {horas < 8 && <span className="pastilla aviso">Jornada reducida</span>}
                  {horas > 8 && <span className="pastilla gris">Más de 8 h</span>}
                </>
              )}
            </div>
          </div>
        </div>
        {horarioAnterior && (
          <p className="ayuda" style={{ margin: 0 }}>
            Antes decía: “{horarioAnterior}”. Se queda así hasta que escojas la entrada y la salida.
            <input type="hidden" name="horario_anterior" value={horarioAnterior} />
          </p>
        )}
      </fieldset>

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
