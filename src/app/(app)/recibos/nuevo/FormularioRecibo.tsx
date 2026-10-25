"use client";

import { useActionState, useMemo, useState } from "react";
import { ReciboHoja } from "@/componentes/ReciboHoja";
import { calcularRecibo, type ExtraCaptura } from "@/lib/calculo";
import { TIPOS_FALTA, type Falta } from "@/lib/tipos";
import { sumarDias } from "@/lib/fechas";
import { dinero } from "@/lib/formato";
import { cantidadSugerida, periodoSugerido } from "@/lib/programa";
import { FORMAS_PAGO, UNIDADES, type AdelantoSaldo, type Trabajador } from "@/lib/tipos";
import { crearRecibo, type EstadoFormulario } from "../acciones";

const NOMBRE_DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function cantidadInicial(t: Trabajador | undefined) {
  const c = t ? cantidadSugerida(t) : null;
  return c === null ? "" : String(c);
}

function diasDelPeriodo(inicio: string, fin: string): string[] {
  const dias: string[] = [];
  for (let d = inicio; d <= fin && dias.length < 31; d = sumarDias(d, 1)) dias.push(d);
  return dias;
}

function etiquetaDia(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return `${NOMBRE_DIA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d}`;
}

export function FormularioRecibo({
  trabajadores,
  adelantos,
  faltas,
  inicial,
  fecha,
  entrego,
}: {
  trabajadores: Trabajador[];
  /** Préstamos y adelantos con saldo pendiente. */
  adelantos: AdelantoSaldo[];
  /** Faltas que todavía no están en un recibo. */
  faltas: Falta[];
  inicial?: string;
  /** Día en que se paga: hoy, o el que viene de la vista de Hoy. */
  fecha: string;
  entrego: string;
}) {
  const primero = trabajadores.find((t) => t.id === inicial);
  const [trabajadorId, setTrabajadorId] = useState(primero?.id ?? "");
  const p0 = periodoSugerido(primero, fecha);
  const [inicio, setInicio] = useState(p0.inicio);
  const [fin, setFin] = useState(p0.fin);
  const [fechaPago, setFechaPago] = useState(fecha);
  const [cantidad, setCantidad] = useState(cantidadInicial(primero));
  const [diasMarcados, setDiasMarcados] = useState<string[]>([]);
  const [extras, setExtras] = useState<ExtraCaptura[]>([]);
  const [abono, setAbono] = useState("");
  const [nota, setNota] = useState("");
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(crearRecibo, { error: null });

  const t = trabajadores.find((x) => x.id === trabajadorId);
  const pendientes = adelantos.filter((a) => a.trabajador_id === trabajadorId && a.saldo > 0);
  const debe = Math.round(pendientes.reduce((s, a) => s + a.saldo, 0) * 100) / 100;
  const abonoNum = Number(abono) || 0;
  const faltasPeriodo = faltas.filter((f) => f.trabajador_id === trabajadorId && f.fecha >= inicio && f.fecha <= fin);
  const porDias = t?.forma_pago === "dia" || t?.forma_pago === "turno";
  const dias = useMemo(() => (inicio && fin && fin >= inicio ? diasDelPeriodo(inicio, fin) : []), [inicio, fin]);

  function escogerTrabajador(id: string) {
    const nuevo = trabajadores.find((x) => x.id === id);
    setTrabajadorId(id);
    const p = periodoSugerido(nuevo, fecha);
    setInicio(p.inicio);
    setFin(p.fin);
    setCantidad(cantidadInicial(nuevo));
    setDiasMarcados([]);
    setAbono("");
  }

  function marcarDia(dia: string) {
    const lista = diasMarcados.includes(dia) ? diasMarcados.filter((d) => d !== dia) : [...diasMarcados, dia];
    setDiasMarcados(lista);
    setCantidad(lista.length ? String(lista.length) : "");
  }

  const num = Number(cantidad);
  const calculo = t
    ? calcularRecibo({
        formaPago: t.forma_pago,
        tarifa: t.tarifa,
        pasaje: t.pasaje,
        cantidad: num > 0 ? num : 0,
        extras: extras.filter((e) => e.descripcion.trim()),
        adelantos: pendientes,
        abono: Math.min(abonoNum, debe),
        faltas: faltasPeriodo,
        diasTrabajo: t.dias_trabajo,
        horasDia: t.horas_dia,
      })
    : { lineas: [], total: 0 };

  const datos = JSON.stringify({
    trabajadorId,
    periodoInicio: inicio,
    periodoFin: fin,
    fechaPago,
    cantidad: num,
    extras,
    abono: abonoNum,
    nota,
  });

  const extraIncompleto = extras.some((e) => e.importe > 0 && !e.descripcion.trim());
  const abonoInvalido = abonoNum < 0 || abonoNum > debe;
  const listo = !!t && num > 0 && calculo.total >= 0 && !extraIncompleto && !abonoInvalido;

  return (
    <div className="dos-columnas">
      <form action={accion} className="izquierda caja relleno formulario">
        <input type="hidden" name="datos" value={datos} />
        <div className="campo">
          <label htmlFor="trabajador">Trabajador</label>
          <select id="trabajador" value={trabajadorId} onChange={(e) => escogerTrabajador(e.target.value)} required>
            <option value="">Escoge a quién se le paga…</option>
            {trabajadores.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre} · {FORMAS_PAGO[x.forma_pago]} · {dinero(x.tarifa)}
              </option>
            ))}
          </select>
        </div>

        <div className="rejilla-2">
          <div className="campo">
            <label htmlFor="inicio">Del</label>
            <input id="inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
          </div>
          <div className="campo">
            <label htmlFor="fin">Al</label>
            <input id="fin" type="date" value={fin} min={inicio} onChange={(e) => setFin(e.target.value)} required />
          </div>
          <div className="campo">
            <label htmlFor="fechaPago">Fecha de pago</label>
            <input id="fechaPago" type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} required />
          </div>
        </div>

        {porDias && dias.length > 1 && (
          <fieldset>
            <legend>Días trabajados</legend>
            <div className="acciones">
              {dias.map((d) => (
                <label key={d} className="casilla">
                  <input type="checkbox" checked={diasMarcados.includes(d)} onChange={() => marcarDia(d)} />
                  {etiquetaDia(d)}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="campo">
          <label htmlFor="cantidad">
            Cantidad trabajada {t ? `(${UNIDADES[t.forma_pago]})` : ""}
            <span className="ayuda"> · medio turno o medio día = 0.5</span>
          </label>
          <input
            id="cantidad"
            type="number"
            inputMode="decimal"
            min="0.5"
            step="0.5"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            required
          />
        </div>

        <fieldset>
          <legend>Extras y descuentos</legend>
          <div className="formulario" style={{ gap: 8 }}>
            {extras.map((e, i) => (
              <div key={i} className="linea-extra">
                <select
                  aria-label="Tipo"
                  value={e.tipo}
                  onChange={(ev) => setExtras(extras.map((x, j) => (j === i ? { ...x, tipo: ev.target.value as ExtraCaptura["tipo"] } : x)))}
                >
                  <option value="extra">Bono o extra (+)</option>
                  <option value="otro">Otro pago (+)</option>
                  <option value="prestamo">Abono a préstamo (−)</option>
                </select>
                <input
                  type="text"
                  aria-label="Por qué"
                  placeholder="Por qué (obligatorio)"
                  value={e.descripcion}
                  onChange={(ev) => setExtras(extras.map((x, j) => (j === i ? { ...x, descripcion: ev.target.value } : x)))}
                />
                <input
                  type="number"
                  aria-label="Importe"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  placeholder="$"
                  value={e.importe || ""}
                  onChange={(ev) => setExtras(extras.map((x, j) => (j === i ? { ...x, importe: Number(ev.target.value) } : x)))}
                />
                <button type="button" className="boton chico" onClick={() => setExtras(extras.filter((_, j) => j !== i))}>
                  Quitar
                </button>
              </div>
            ))}
            <div>
              <button
                type="button"
                className="boton chico"
                onClick={() => setExtras([...extras, { tipo: "extra", descripcion: "", importe: 0 }])}
              >
                + Agregar extra o descuento
              </button>
            </div>
          </div>
        </fieldset>

        {t?.forma_pago === "semana" && faltasPeriodo.length > 0 && (
          <div className="alerta aviso">
            <strong>Faltas en este periodo</strong> (entran solas al recibo):
            <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
              {faltasPeriodo.map((f) => (
                <li key={f.id}>
                  {f.fecha.split("-").reverse().join("/")} · {f.fraccion < 1 ? "media falta, " : ""}
                  {TIPOS_FALTA[f.tipo].nombre.toLowerCase()}
                  {f.nota ? ` · ${f.nota}` : ""}
                </li>
              ))}
            </ul>
            Si alguna está mal, quítala en <a href="/faltas">Faltas</a> antes de guardar.
          </div>
        )}

        {pendientes.length > 0 && (
          <fieldset className="abono">
            <legend>Abono a préstamos y adelantos</legend>
            <p style={{ margin: 0 }}>
              Debe <strong>{dinero(debe)}</strong>
              {pendientes.length > 1 ? ` en ${pendientes.length} préstamos` : ""}. Escribe lo que el trabajador quiere
              abonar esta vez; puede ser $0. Se aplica primero al más viejo.
            </p>
            <div className="acciones">
              <label htmlFor="abono" className="sr-only">
                Cuánto abona
              </label>
              <input
                id="abono"
                type="number"
                inputMode="decimal"
                min="0"
                max={debe}
                step="0.5"
                placeholder="0"
                value={abono}
                onChange={(e) => setAbono(e.target.value)}
                style={{ maxWidth: 160 }}
              />
              <button type="button" className="boton chico" onClick={() => setAbono("")}>
                No abona
              </button>
              <button type="button" className="boton chico" onClick={() => setAbono(String(debe))}>
                Todo ({dinero(debe)})
              </button>
            </div>
            {abonoInvalido && <p className="alerta">No puede abonar más de lo que debe ({dinero(debe)}).</p>}
          </fieldset>
        )}

        <div className="campo">
          <label htmlFor="nota">Nota (opcional)</label>
          <input
            id="nota"
            type="text"
            value={nota}
            placeholder="Por ejemplo: se quedó 2 horas más el sábado"
            onChange={(e) => setNota(e.target.value)}
          />
        </div>

        {calculo.total < 0 && <p className="alerta">Los descuentos son mayores que el pago.</p>}
        {extraIncompleto && <p className="alerta aviso">Cada extra o descuento necesita decir por qué.</p>}
        {estado.error && (
          <p className="alerta aparece" role="alert">
            {estado.error}
          </p>
        )}

        <div className="acciones">
          <button type="submit" className="boton primario" disabled={!listo || enviando}>
            {enviando ? "Guardando…" : `Guardar recibo por ${dinero(calculo.total)}`}
          </button>
        </div>
        <p className="ayuda" style={{ margin: 0, fontSize: 13, color: "var(--tenue)" }}>
          Al guardar se asigna el folio y el recibo ya no se puede editar. Si hay un error, el administrador lo cancela y se
          hace uno nuevo.
        </p>
      </form>

      <section className="derecha" aria-label="Vista previa del recibo">
        <span className="titulo-vista">Así se va a imprimir (media carta, con copia)</span>
        <ReciboHoja
          datos={{
            folio: null,
            trabajador: t?.nombre ?? "",
            actividad: t?.actividad ?? null,
            periodoInicio: inicio,
            periodoFin: fin,
            fechaPago,
            lineas: calculo.lineas,
            total: calculo.total,
            nota: nota.trim() || null,
            entrego,
          }}
        />
      </section>
    </div>
  );
}
