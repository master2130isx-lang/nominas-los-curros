"use client";

import { useActionState, useMemo, useState } from "react";
import { ReciboHoja } from "@/componentes/ReciboHoja";
import { calcularRecibo, type ExtraCaptura } from "@/lib/calculo";
import { semanaDe, sumarDias } from "@/lib/fechas";
import { dinero } from "@/lib/formato";
import { FORMAS_PAGO, UNIDADES, type Adelanto, type Trabajador } from "@/lib/tipos";
import { crearRecibo, type EstadoFormulario } from "../acciones";

const NOMBRE_DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function periodoInicial(t: Trabajador | undefined, hoy: string) {
  if (t?.forma_pago === "semana") return semanaDe(hoy);
  return { inicio: hoy, fin: hoy };
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
  inicial,
  hoy,
  entrego,
}: {
  trabajadores: Trabajador[];
  adelantos: Adelanto[];
  inicial?: string;
  hoy: string;
  entrego: string;
}) {
  const primero = trabajadores.find((t) => t.id === inicial);
  const [trabajadorId, setTrabajadorId] = useState(primero?.id ?? "");
  const p0 = periodoInicial(primero, hoy);
  const [inicio, setInicio] = useState(p0.inicio);
  const [fin, setFin] = useState(p0.fin);
  const [fechaPago, setFechaPago] = useState(hoy);
  const [cantidad, setCantidad] = useState(primero?.forma_pago === "semana" ? "1" : "");
  const [diasMarcados, setDiasMarcados] = useState<string[]>([]);
  const [extras, setExtras] = useState<ExtraCaptura[]>([]);
  const [adelantosSel, setAdelantosSel] = useState<string[]>([]);
  const [nota, setNota] = useState("");
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(crearRecibo, { error: null });

  const t = trabajadores.find((x) => x.id === trabajadorId);
  const pendientes = adelantos.filter((a) => a.trabajador_id === trabajadorId);
  const porDias = t?.forma_pago === "dia" || t?.forma_pago === "turno";
  const dias = useMemo(() => (inicio && fin && fin >= inicio ? diasDelPeriodo(inicio, fin) : []), [inicio, fin]);

  function escogerTrabajador(id: string) {
    const nuevo = trabajadores.find((x) => x.id === id);
    setTrabajadorId(id);
    const p = periodoInicial(nuevo, hoy);
    setInicio(p.inicio);
    setFin(p.fin);
    setCantidad(nuevo?.forma_pago === "semana" ? "1" : "");
    setDiasMarcados([]);
    setAdelantosSel([]);
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
        adelantos: pendientes.filter((a) => adelantosSel.includes(a.id)),
      })
    : { lineas: [], total: 0 };

  const datos = JSON.stringify({
    trabajadorId,
    periodoInicio: inicio,
    periodoFin: fin,
    fechaPago,
    cantidad: num,
    extras,
    adelantos: adelantosSel,
    nota,
  });

  const extraIncompleto = extras.some((e) => e.importe > 0 && !e.descripcion.trim());
  const listo = !!t && num > 0 && calculo.total >= 0 && !extraIncompleto;

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

        {pendientes.length > 0 && (
          <fieldset>
            <legend>Descontar adelantos pendientes</legend>
            <div className="acciones">
              {pendientes.map((a) => (
                <label key={a.id} className="casilla">
                  <input
                    type="checkbox"
                    checked={adelantosSel.includes(a.id)}
                    onChange={() =>
                      setAdelantosSel(adelantosSel.includes(a.id) ? adelantosSel.filter((x) => x !== a.id) : [...adelantosSel, a.id])
                    }
                  />
                  {dinero(a.monto)} del {a.fecha.split("-").reverse().join("/")}
                  {a.descripcion ? ` · ${a.descripcion}` : ""}
                </label>
              ))}
            </div>
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
        {estado.error && <p className="alerta">{estado.error}</p>}

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
