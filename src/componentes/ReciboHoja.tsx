import { dinero, fechaLarga, folio as fmtFolio, rango } from "@/lib/formato";
import { pesosConLetra } from "@/lib/letras";
import { NEGOCIO, NOTA_ALIMENTACION_MINIMO, TEXTO_ALIMENTACION } from "@/lib/negocio";
import type { TipoConcepto } from "@/lib/tipos";
import "@/app/recibo.css";

/** Datos del trabajador que salen en el comprobante (además de nombre y puesto del recibo). */
export interface DatosTrabajadorHoja {
  curp: string | null;
  rfc: string | null;
  nss: string | null;
  fechaIngreso: string | null;
  formaPago: string;
  cantidad: string;
  horario: string | null;
  dias: string;
  alimentacion: boolean;
  /** Gana menos que el salario mínimo proporcional: la comida se anota como compensación. */
  bajoMinimo: boolean;
  /** Cobra cada día: firma una vez a la semana en la hoja semanal. */
  firmaSemanal: boolean;
  /** Semana de la hoja donde firma (ya recortada al inicio de la plataforma). */
  semanaFirma: string | null;
}

export interface DatosHoja {
  folio: number | null;
  trabajador: string;
  actividad: string | null;
  periodoInicio: string;
  periodoFin: string;
  fechaPago: string;
  lineas: { tipo?: TipoConcepto; descripcion: string; importe: number }[];
  total: number;
  nota: string | null;
  entrego: string;
  datos?: DatosTrabajadorHoja;
}

export const DOMICILIO = NEGOCIO.domicilio;

const DEDUCCIONES: TipoConcepto[] = ["falta", "prestamo", "adelanto"];
const esDeduccion = (l: { tipo?: TipoConcepto; importe: number }) => l.importe < 0 || (l.tipo !== undefined && DEDUCCIONES.includes(l.tipo));

/**
 * Comprobante de pago en hoja carta: patrón, trabajador, periodo, percepciones y
 * deducciones, neto, condiciones de trabajo, conformidad y firmas.
 * `marca` imprime ORIGINAL, COPIA o REIMPRESIÓN; `sello` un sello encima (CANCELADO).
 */
export function ReciboHoja({ datos, marca, sello }: { datos: DatosHoja; marca?: string; sello?: string }) {
  const percepciones = datos.lineas.filter((l) => !esDeduccion(l));
  const deducciones = datos.lineas.filter(esDeduccion);
  const totalPercepciones = percepciones.reduce((s, l) => s + l.importe, 0);
  const totalDeducciones = deducciones.reduce((s, l) => s - l.importe, 0);
  const d = datos.datos;
  const periodo = datos.periodoInicio && datos.periodoFin ? rango(datos.periodoInicio, datos.periodoFin) : "—";

  return (
    <article className="hoja" aria-label={`Recibo ${datos.folio ? fmtFolio(datos.folio) : "nuevo"}`}>
      <header className="cabeza">
        <div className="negocio">
          <strong>{NEGOCIO.nombre}</strong>
          {NEGOCIO.rfc && <span>RFC {NEGOCIO.rfc}</span>}
          {NEGOCIO.registroPatronal && <span>Registro patronal IMSS {NEGOCIO.registroPatronal}</span>}
          <span>{NEGOCIO.domicilio}</span>
        </div>
        <div className="folio">
          {marca && <span className="copia-de">{marca}</span>}
          <span className="titulo-doc">Recibo de pago de salario</span>
          <strong>Folio {datos.folio ? fmtFolio(datos.folio) : "(al guardar)"}</strong>
          <span>Pagado el {datos.fechaPago ? fechaLarga(datos.fechaPago) : "—"}</span>
        </div>
      </header>

      <section className="bloque" aria-label="Datos del trabajador">
        <h2>Trabajador</h2>
        <dl className="datos">
          <div className="ancho">
            <dt>Nombre</dt>
            <dd>{datos.trabajador || "—"}</dd>
          </div>
          <div>
            <dt>Puesto</dt>
            <dd>{datos.actividad || "—"}</dd>
          </div>
          <div>
            <dt>CURP</dt>
            <dd className="clave">{d?.curp || "—"}</dd>
          </div>
          <div>
            <dt>RFC</dt>
            <dd className="clave">{d?.rfc || "—"}</dd>
          </div>
          <div>
            <dt>NSS</dt>
            <dd className="clave">{d?.nss || "—"}</dd>
          </div>
          <div>
            <dt>Fecha de ingreso</dt>
            <dd>{d?.fechaIngreso ? fechaLarga(d.fechaIngreso) : "—"}</dd>
          </div>
          <div>
            <dt>Forma de pago</dt>
            <dd>{d?.formaPago ?? "—"}</dd>
          </div>
          <div className="ancho">
            <dt>Periodo pagado</dt>
            <dd>{periodo}</dd>
          </div>
          <div>
            <dt>Trabajado</dt>
            <dd>{d?.cantidad ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <div className="desglose">
        <table>
          <caption>Percepciones</caption>
          <thead>
            <tr>
              <th scope="col">Concepto</th>
              <th scope="col" className="importe">
                Importe
              </th>
            </tr>
          </thead>
          <tbody>
            {percepciones.map((l, i) => (
              <tr key={i}>
                <td>{l.descripcion}</td>
                <td className="importe">{dinero(l.importe)}</td>
              </tr>
            ))}
            {(d?.alimentacion ?? false) && (
              <tr className="especie">
                <td>{TEXTO_ALIMENTACION}</td>
                <td className="importe">En especie</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td>Total percepciones</td>
              <td className="importe">{dinero(totalPercepciones)}</td>
            </tr>
          </tfoot>
        </table>
        <table>
          <caption>Deducciones</caption>
          <thead>
            <tr>
              <th scope="col">Concepto</th>
              <th scope="col" className="importe">
                Importe
              </th>
            </tr>
          </thead>
          <tbody>
            {deducciones.length === 0 ? (
              <tr>
                <td className="sin">Sin deducciones</td>
                <td className="importe">{dinero(0)}</td>
              </tr>
            ) : (
              deducciones.map((l, i) => (
                <tr key={i}>
                  <td>{l.descripcion}</td>
                  <td className="importe">{dinero(-l.importe)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td>Total deducciones</td>
              <td className="importe">{dinero(totalDeducciones)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="neto">
        <span>Neto pagado en efectivo</span>
        <strong>{dinero(datos.total)}</strong>
        <span className="letra">{pesosConLetra(datos.total)}</span>
      </div>

      {(datos.nota || (d?.alimentacion && d.bajoMinimo)) && (
        <div className="notas">
          {datos.nota && (
            <p>
              <b>Nota:</b> {datos.nota}
            </p>
          )}
          {d?.alimentacion && d.bajoMinimo && <p className="nota-alimentacion">{NOTA_ALIMENTACION_MINIMO}</p>}
        </div>
      )}

      <section className="bloque condiciones" aria-label="Condiciones de trabajo">
        <h2>Condiciones de trabajo</h2>
        <p>
          <b>Lugar:</b> {NEGOCIO.nombre}, {NEGOCIO.domicilio.replace(/\.$/, "")}. <b>Horario:</b> {d?.horario || "el acordado"}
          {d?.dias ? `, ${d.dias}` : ""}. <b>Alimentación:</b>{" "}
          {d?.alimentacion ? "se proporciona durante la jornada, sin costo para el trabajador" : "no se proporciona"}.
        </p>
      </section>

      <p className="conformidad">
        Recibí de {NEGOCIO.nombre} la cantidad neta de <b>{dinero(datos.total)}</b> ({pesosConLetra(datos.total)}) en
        efectivo, por el periodo del {periodo}, conforme al desglose anterior. Estoy conforme con el pago y con las
        condiciones de trabajo aquí descritas.
      </p>

      <div className="firmas">
        {d?.firmaSemanal ? (
          <div className="firma-semanal">
            Cobra cada día: firma una sola vez en la hoja semanal
            {d.semanaFirma ? ` del ${d.semanaFirma}` : ""}.
          </div>
        ) : (
          <div>
            <span className="linea" />
            Firma o huella de {datos.trabajador || "el trabajador"}
            <small>Recibí conforme</small>
          </div>
        )}
        <div>
          <span className="linea" />
          Por el patrón: {datos.entrego || NEGOCIO.nombre}
          <small>Entregó el pago</small>
        </div>
      </div>
      {sello && <div className="sello">{sello}</div>}
    </article>
  );
}
