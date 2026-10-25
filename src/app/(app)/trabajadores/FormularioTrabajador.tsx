"use client";

import { useActionState, useState } from "react";
import { cantidad } from "@/lib/formato";
import { horasEntre, leerHorario } from "@/lib/horario";
import { DIAS_SEMANA } from "@/lib/programa";
import { FORMAS_PAGO, TIPOS_CONTRATO, TIPOS_TRABAJADOR, type PagoCuando, type Trabajador } from "@/lib/tipos";
import type { EstadoFormulario } from "../recibos/acciones";
import { guardarTrabajador } from "./acciones";

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function FormularioTrabajador({ trabajador, esAdmin = true }: { trabajador?: Trabajador; esAdmin?: boolean }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarTrabajador, { error: null });
  const t = trabajador;
  const [pagoCuando, setPagoCuando] = useState<PagoCuando>(t?.pago_cuando ?? "cada_dia");
  const leido = leerHorario(t?.horario);
  const [entrada, setEntrada] = useState(leido?.entrada ?? "");
  const [salida, setSalida] = useState(leido?.salida ?? "");
  const horas = entrada && salida ? horasEntre(entrada, salida) : null;
  // Un horario viejo escrito a mano que no se pudo leer se conserva mientras no se escojan horas.
  const horarioAnterior = t?.horario && !leido ? t.horario : null;
  // Al editar, la tarifa y la baja solo las cambia el administrador.
  const bloqueado = Boolean(t) && !esAdmin;

  return (
    <form action={accion} className="caja relleno formulario formulario-trabajador">
      {t && <input type="hidden" name="id" value={t.id} />}

      <fieldset className="grupo">
        <legend>Datos personales</legend>
        <div className="rejilla-dos">
          <div className="campo">
            <label htmlFor="nombre">Nombre completo</label>
            <input id="nombre" name="nombre" type="text" defaultValue={t?.nombre} required autoComplete="off" />
          </div>
          <div className="campo">
            <label htmlFor="fecha_nacimiento">Fecha de nacimiento</label>
            <input id="fecha_nacimiento" name="fecha_nacimiento" type="date" defaultValue={t?.fecha_nacimiento ?? ""} />
          </div>
        </div>
        <div className="rejilla-tres uniforme">
          <div className="campo">
            <label htmlFor="curp">CURP</label>
            <input id="curp" name="curp" type="text" maxLength={18} defaultValue={t?.curp ?? ""} autoCapitalize="characters" spellCheck={false} />
          </div>
          <div className="campo">
            <label htmlFor="rfc">RFC</label>
            <input id="rfc" name="rfc" type="text" maxLength={13} defaultValue={t?.rfc ?? ""} autoCapitalize="characters" spellCheck={false} />
          </div>
          <div className="campo">
            <label htmlFor="nss">NSS (IMSS)</label>
            <input id="nss" name="nss" type="text" inputMode="numeric" maxLength={11} defaultValue={t?.nss ?? ""} />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="domicilio">Domicilio</label>
          <input id="domicilio" name="domicilio" type="text" defaultValue={t?.domicilio ?? ""} placeholder="Calle, número, colonia, municipio" />
        </div>
        <div className="rejilla-tres uniforme">
          <div className="campo">
            <label htmlFor="telefono">Teléfono</label>
            <input id="telefono" name="telefono" type="tel" defaultValue={t?.telefono ?? ""} />
          </div>
          <div className="campo">
            <label htmlFor="contacto_emergencia">Contacto de emergencia</label>
            <input id="contacto_emergencia" name="contacto_emergencia" type="text" defaultValue={t?.contacto_emergencia ?? ""} placeholder="Nombre y parentesco" />
          </div>
          <div className="campo">
            <label htmlFor="telefono_emergencia">Tel. de emergencia</label>
            <input id="telefono_emergencia" name="telefono_emergencia" type="tel" defaultValue={t?.telefono_emergencia ?? ""} />
          </div>
        </div>
        <p className="ayuda" style={{ margin: 0 }}>
          Solo el nombre es obligatorio. CURP, RFC y NSS se revisan con su formato oficial al guardar.
        </p>
      </fieldset>

      <fieldset className="grupo">
        <legend>Puesto y contrato</legend>
        <div className="rejilla-dos uniforme">
          <div className="campo">
            <label htmlFor="actividad">Puesto</label>
            <input id="actividad" name="actividad" type="text" defaultValue={t?.actividad ?? ""} placeholder="Cocinera, mesero, aseo…" />
          </div>
          <div className="campo">
            <label htmlFor="fecha_ingreso">Fecha de ingreso</label>
            <input id="fecha_ingreso" name="fecha_ingreso" type="date" defaultValue={t?.fecha_ingreso ?? ""} />
          </div>
          <div className="campo">
            <label htmlFor="tipo">Tipo de trabajador</label>
            <select id="tipo" name="tipo" defaultValue={t?.tipo ?? "informal_turno"}>
              {Object.entries(TIPOS_TRABAJADOR).map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="tipo_contrato">Tipo de contrato</label>
            <select id="tipo_contrato" name="tipo_contrato" defaultValue={t?.tipo_contrato ?? ""}>
              <option value="">Sin contrato escrito</option>
              {Object.entries(TIPOS_CONTRATO).map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>Pago</legend>
        <div className="rejilla-tres uniforme">
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
            <label htmlFor="tarifa">Tarifa (MXN)</label>
            <input
              id="tarifa"
              name="tarifa"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              defaultValue={t?.tarifa}
              required
              readOnly={bloqueado}
              aria-describedby={bloqueado ? "pago-ayuda" : undefined}
            />
          </div>
          <div className="campo">
            <label htmlFor="pasaje">Pasaje (MXN)</label>
            <input id="pasaje" name="pasaje" type="number" inputMode="decimal" min="0" step="0.5" defaultValue={t?.pasaje ?? 0} />
          </div>
        </div>
        <div className="rejilla-dos uniforme">
          <div className="campo">
            <label htmlFor="salario_diario">Salario diario registrado (MXN)</label>
            <input
              id="salario_diario"
              name="salario_diario"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={t?.salario_diario ?? ""}
              readOnly={bloqueado}
              aria-describedby={bloqueado ? "pago-ayuda" : undefined}
            />
          </div>
          <div className="campo">
            <span className="etiqueta">Alimentación</span>
            <label className="casilla">
              <input type="checkbox" name="alimentacion" defaultChecked={t ? t.alimentacion : true} />
              Se le da de comer sin costo
            </label>
          </div>
        </div>
        {bloqueado && (
          <p id="pago-ayuda" className="ayuda" style={{ margin: 0 }}>
            Solo el administrador cambia la tarifa y el salario diario.
          </p>
        )}
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
          El pasaje (opcional) se suma por cada día o turno si cobra por día o turno; si no, una vez por recibo. El salario
          diario registrado es el del contrato o el IMSS; la comida sale en el recibo como prestación en especie.
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
      {t &&
        (bloqueado ? (
          <p className="ayuda" style={{ margin: 0 }}>
            {t.activo ? "Sigue trabajando." : "Dado de baja."} Solo el administrador da de baja o reactiva a un trabajador.
            {t.activo && <input type="hidden" name="activo" value="on" />}
          </p>
        ) : (
          <label className="casilla" style={{ alignSelf: "flex-start" }}>
            <input type="checkbox" name="activo" defaultChecked={t.activo} />
            Sigue trabajando (si lo desmarcas ya no aparece para nuevos pagos)
          </label>
        ))}
      {estado.error && (
        <p className="alerta aparece" role="alert">
          {estado.error}
        </p>
      )}
      <div>
        <button type="submit" className="boton primario" disabled={enviando} aria-busy={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
