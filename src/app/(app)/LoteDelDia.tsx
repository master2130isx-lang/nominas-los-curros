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
              <th>
                <span className="sr-only">Incluir</span>
              </th>
              <th>Trabajador</th>
              <th>Periodo</th>
              <th>Cantidad</th>
              <th className="num">Total</th>
              <th>
                <span className="sr-only">Otras opciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const t = total(f);
              const id = `c-${f.trabajadorId}`;
              return (
                <tr key={f.trabajadorId}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Incluir a ${f.nombre}`}
                      checked={marcados.includes(f.trabajadorId)}
                      onChange={() =>
                        setMarcados(
                          marcados.includes(f.trabajadorId)
                            ? marcados.filter((x) => x !== f.trabajadorId)
                            : [...marcados, f.trabajadorId],
                        )
                      }
                    />
                  </td>
                  <td>
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
                        Tiene {dinero(f.adelantoPendiente)} de adelanto por descontar
                      </span>
                    )}
                  </td>
                  <td>{rango(f.periodoInicio, f.periodoFin)}</td>
                  <td>
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
                    />{" "}
                    <span style={{ fontSize: 13, color: "var(--tenue)" }}>{UNIDADES[f.formaPago]}</span>
                  </td>
                  <td className="num">{t === null ? "—" : dinero(t)}</td>
                  <td>
                    <Link className="boton chico" href={`/recibos/nuevo?trabajador=${f.trabajadorId}&fecha=${fecha}`}>
                      Con extras o adelantos
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {estado.error && (
        <p className="alerta">
          {estado.creados > 0 ? `Se hicieron ${estado.creados} recibos, pero uno falló: ` : ""}
          {estado.error}
        </p>
      )}
      <div className="acciones">
        <button type="submit" className="boton primario" disabled={!listos.length || enviando}>
          {enviando
            ? "Haciendo recibos…"
            : `Hacer ${listos.length} ${listos.length === 1 ? "recibo" : "recibos"} e imprimir · ${dinero(
                listos.reduce((s, f) => s + (total(f) ?? 0), 0),
              )}`}
        </button>
        <span style={{ fontSize: 13, color: "var(--tenue)" }}>
          Para agregar extras, descuentos o adelantos, usa “Con extras o adelantos”.
        </span>
      </div>
    </form>
  );
}
