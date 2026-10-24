import { dinero, fechaLarga, folio as fmtFolio, rango } from "@/lib/formato";
import { pesosConLetra } from "@/lib/letras";

export interface DatosHoja {
  folio: number | null;
  trabajador: string;
  actividad: string | null;
  periodoInicio: string;
  periodoFin: string;
  fechaPago: string;
  lineas: { descripcion: string; importe: number }[];
  total: number;
  nota: string | null;
  entrego: string;
}

export const DOMICILIO = process.env.NEXT_PUBLIC_DOMICILIO_NEGOCIO || "Tamuín, S.L.P.";

/** Un recibo de pago. `marca` imprime ORIGINAL, COPIA o REIMPRESIÓN; `sello` un sello encima (CANCELADO). */
export function ReciboHoja({
  datos,
  marca,
  sello,
}: {
  datos: DatosHoja;
  marca?: string;
  sello?: string;
}) {
  return (
    <article className="hoja" aria-label={`Recibo ${datos.folio ? fmtFolio(datos.folio) : "nuevo"}`}>
      <div className="cabeza">
        <div className="negocio">
          <strong>Restaurante Los Curros</strong>
          <span>{DOMICILIO}</span>
        </div>
        <div className="folio">
          {marca && <span className="copia-de">{marca}</span>}
          <span>Recibo de pago</span>
          <strong>Folio {datos.folio ? fmtFolio(datos.folio) : "(al guardar)"}</strong>
        </div>
      </div>
      <div className="datos">
        <span>
          <b>Trabajador:</b> {datos.trabajador || "—"}
        </span>
        <span>
          <b>Actividad:</b> {datos.actividad || "—"}
        </span>
        <span>
          <b>Periodo:</b> {datos.periodoInicio && datos.periodoFin ? rango(datos.periodoInicio, datos.periodoFin) : "—"}
        </span>
        <span>
          <b>Fecha de pago:</b> {datos.fechaPago ? fechaLarga(datos.fechaPago) : "—"}
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th className="importe">Importe</th>
          </tr>
        </thead>
        <tbody>
          {datos.lineas.map((l, i) => (
            <tr key={i}>
              <td>{l.descripcion}</td>
              <td className="importe">{dinero(l.importe)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Total pagado en efectivo</td>
            <td className="importe">{dinero(datos.total)}</td>
          </tr>
        </tbody>
      </table>
      <span className="letra">({pesosConLetra(datos.total)})</span>
      {datos.nota && (
        <p>
          <b>Nota:</b> {datos.nota}
        </p>
      )}
      <p>Recibí la cantidad indicada a mi entera satisfacción por los trabajos descritos.</p>
      <div className="firmas">
        <div>Firma o huella de {datos.trabajador || "el trabajador"}</div>
        <div>Entregó: {datos.entrego}</div>
      </div>
      {sello && <div className="sello">{sello}</div>}
    </article>
  );
}
