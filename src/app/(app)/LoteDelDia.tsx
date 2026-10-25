"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { calcularRecibo, type FaltaCaptura } from "@/lib/calculo";
import { dinero, rango } from "@/lib/formato";
import { FORMAS_PAGO, UNIDADES, type FormaPago } from "@/lib/tipos";
import { crearLote, type EstadoLote } from "./recibos/acciones";

export interface FilaLote {
  trabajadorId: string;
  nombre: string;
  actividad: string | null;
  formaPago: FormaPago;
  tarifa: number;
  pasaje: number;
  cantidad: number | null;
  periodoInicio: string;
  periodoFin: string;
  adelantoPendiente: number;
  /** Faltas sin recibo dentro del periodo (se descuentan solas en semana fija). */
  faltas: FaltaCaptura[];
  diasTrabajo: number[];
  horasDia: number | null;
}

/** Los que cobran este día: se escoge a quiénes, se ajusta la cantidad y se hacen todos los recibos juntos. */
export function LoteDelDia({ filas, fecha }: { filas: FilaLote[]; fecha: string }) {
  const [marcados, setMarcados] = useState<string[]>(filas.filter((f) => f.cantidad !== null).map((f) => f.trabajadorId));
  const [cantidades, setCantidades] = useState<Record<string, string>>(
    Object.fromEntries(filas.map((f) => [f.trabajadorId, f.cantidad === null ? "" : String(f.cantidad)])),
  );
  const [estado, accion, enviando] = useActionState<EstadoLote, FormData>(crearLote, { error: null, creados: 0 });

  const elegidas = filas.filter((f) => marcados.includes(f.trabajadorId));
  const total = (f: FilaLote) => {
    const c = Number(cantidades[f.trabajadorId]);
    if (!(c > 0)) return null;
    return calcularRecibo({
      formaPago: f.formaPago,
      tarifa: f.tarifa,
      pasaje: f.pasaje,
      cantidad: c,
      extras: [],
      adelantos: [],
      faltas: f.faltas,
      diasTrabajo: f.diasTrabajo,
      horasDia: f.horasDia,
    }).total;
  };
  const listos = elegidas.filter((f) => total(f) !== null);
  const datos = JSON.stringify(
    listos.map((f) => ({
      trabajadorId: f.trabajadorId,
      periodoInicio: f.periodoInicio,
      periodoFin: f.periodoFin,
      fechaPago: fecha,
      cantidad: Number(cantidades[f.trabajadorId]),
    })),
  );

  return (
    <form action={accion} className="formulario" style={{ gap: 12 }}>
      <input type="hidden" name="datos" value={datos} />
      <div className="caja tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Incluir</span>
              </th>
              <th scope="col">Trabajador</th>
              <th scope="col">Periodo</th>
              <th scope="col">Cantidad</th>
              <th scope="col" className="num">
                Total
              </th>
              <th scope="col">
                <span className="sr-only">Otras opciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const t = total(f);
              const id = `c-${f.trabajadorId}`;
              const incluido = marcados.includes(f.trabajadorId);
              return (
                <tr key={f.trabajadorId} className={incluido ? undefined : "apagada"}>
                  <td className="lado">
                    <label className="marcar">
                      <input
                        type="checkbox"
                        aria-label={`Incluir a ${f.nombre}`}
                        checked={incluido}
                        onChange={() =>
                          setMarcados(incluido ? marcados.filter((x) => x !== f.trabajadorId) : [...marcados, f.trabajadorId])
                        }
                      />
                    </label>
                  </td>
                  <td className="principal con-lado">
                    <strong>{f.nombre}</strong>
                    <span className="secundario">
                      {FORMAS_PAGO[f.formaPago]} · {dinero(f.tarifa)}
                      {f.pasaje > 0 ? ` + ${dinero(f.pasaje)} pasaje` : ""}
                    </span>
                    {f.formaPago === "semana" && f.faltas.length > 0 && (
                      <span className="secundario" style={{ color: "var(--aviso-texto)" }}>
                        {f.faltas.length === 1 ? "1 falta en el periodo" : `${f.faltas.length} faltas en el periodo`}
                        {f.faltas.some((x) => x.tipo !== "justificada") ? " (se descuenta sola)" : " (justificada)"}
                      </span>
                    )}
                    {f.adelantoPendiente > 0 && (
                      <span className="secundario" style={{ color: "var(--aviso-texto)" }}>
                        Debe {dinero(f.adelantoPendiente)} de préstamos; si quiere abonar, usa “Con extras o abono”
                      </span>
                    )}
                  </td>
                  <td data-etiqueta="Periodo">{rango(f.periodoInicio, f.periodoFin)}</td>
                  <td data-etiqueta="Cantidad">
                    <span className="acciones" style={{ gap: 6, flexWrap: "nowrap" }}>
                      <label htmlFor={id} className="sr-only">
                        Cantidad de {f.nombre}
                      </label>
                      <input
                        id={id}
                        type="number"
                        inputMode="decimal"
                        min="0.5"
                        step="0.5"
                        value={cantidades[f.trabajadorId]}
                        placeholder={f.formaPago === "hora" ? "Horas" : ""}
                        onChange={(e) => setCantidades({ ...cantidades, [f.trabajadorId]: e.target.value })}
                      />
                      <span style={{ fontSize: 13, color: "var(--tenue)" }}>{UNIDADES[f.formaPago]}</span>
                    </span>
                  </td>
                  <td className="num" data-etiqueta="Total">
                    {t === null ? "—" : dinero(t)}
                  </td>
                  <td className="acciones-celda">
                    <Link className="boton chico" href={`/recibos/nuevo?trabajador=${f.trabajadorId}&fecha=${fecha}`}>
                      Con extras o abono
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {estado.error && (
        <p className="alerta aparece" role="alert">
          {estado.creados > 0 ? `Se hicieron ${estado.creados} recibos, pero uno falló: ` : ""}
          {estado.error}
        </p>
      )}
      <div className="acciones">
        <button type="submit" className="boton primario" disabled={!listos.length || enviando} aria-busy={enviando}>
          {enviando
            ? "Haciendo recibos…"
            : `Hacer ${listos.length} ${listos.length === 1 ? "recibo" : "recibos"} e imprimir · ${dinero(
                listos.reduce((s, f) => s + (total(f) ?? 0), 0),
              )}`}
        </button>
        <span style={{ fontSize: 13, color: "var(--tenue)" }}>
          Estos recibos no llevan abono a préstamos. Para agregar extras, descuentos o un abono, usa “Con extras o abono”.
        </span>
      </div>
    </form>
  );
}
