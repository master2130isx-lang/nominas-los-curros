import Link from "next/link";
import { notFound } from "next/navigation";
import { DOMICILIO } from "@/componentes/ReciboHoja";
import { hoy } from "@/lib/fechas";
import { dinero, fechaLarga } from "@/lib/formato";
import { descuentoPorFalta, esSemanaCompleta, salarioDiario } from "@/lib/ley";
import { pesosConLetra } from "@/lib/letras";
import { DIAS_SEMANA, textoDiaPago } from "@/lib/programa";
import { requerirSesion } from "@/lib/sesion";
import { FORMAS_PAGO, type Trabajador } from "@/lib/tipos";
import { BotonImprimirSimple } from "./BotonImprimirSimple";

function listaDias(dias: number[]): string {
  const nombres = [...dias].sort((a, b) => a - b).map((d) => DIAS_SEMANA[d - 1]);
  if (nombres.length === 7) return "todos los días de la semana";
  if (nombres.length <= 1) return nombres[0] ?? "—";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

function Constancia({ t, marca, fecha }: { t: Trabajador; marca: string; fecha: string }) {
  const tarifa = Number(t.tarifa);
  const pasaje = Number(t.pasaje);
  const horas = t.horas_dia === null ? null : Number(t.horas_dia);
  const datos = { ...t, tarifa, pasaje, horas_dia: horas };
  const descanso = [1, 2, 3, 4, 5, 6, 7].filter((d) => !t.dias_trabajo.includes(d));
  const diario = salarioDiario(datos);
  const porFalta = descuentoPorFalta(datos);
  const reducida = horas !== null && horas < 8;

  return (
    <article className="pagina-carta">
      <div className="cabeza">
        <div className="negocio">
          <strong>Restaurante Los Curros</strong>
          <span>{DOMICILIO}</span>
        </div>
        <div className="folio">
          <span className="copia-de">{marca}</span>
          <strong>Constancia de condiciones de trabajo</strong>
        </div>
      </div>

      <p>
        En {DOMICILIO}, a {fechaLarga(fecha)}, el Restaurante Los Curros (en adelante, el patrón) y{" "}
        <b>{t.nombre}</b>
        {t.curp ? `, con CURP ${t.curp}` : ""} (en adelante, el trabajador), hacen constar por escrito las condiciones de
        trabajo que tienen acordadas, conforme a los artículos 24 y 25 de la Ley Federal del Trabajo:
      </p>

      <table>
        <tbody>
          <tr>
            <th>Actividad o servicio</th>
            <td>{t.actividad || "—"}</td>
          </tr>
          <tr>
            <th>Fecha en que empezó</th>
            <td>{t.fecha_ingreso ? fechaLarga(t.fecha_ingreso) : "—"}</td>
          </tr>
          <tr>
            <th>Días de trabajo</th>
            <td>{t.dias_trabajo.length ? listaDias(t.dias_trabajo) : "Según se requiera"}</td>
          </tr>
          {esSemanaCompleta(datos) && (
            <tr>
              <th>Día de descanso</th>
              <td>{listaDias(descanso)}, con goce de sueldo (art. 69)</td>
            </tr>
          )}
          <tr>
            <th>Jornada</th>
            <td>
              {horas ? `${horas} horas por día` : "—"}
              {t.horario ? ` (${t.horario})` : ""}
              {reducida && ". Jornada reducida acordada entre ambas partes, con pago proporcional"}
            </td>
          </tr>
          <tr>
            <th>Salario</th>
            <td>
              {dinero(tarifa)} ({pesosConLetra(tarifa)}) · {FORMAS_PAGO[t.forma_pago].toLowerCase()}
              {diario !== null && esSemanaCompleta(datos) && `. Salario diario: ${dinero(diario)} (semanal entre 7)`}
            </td>
          </tr>
          {pasaje > 0 && (
            <tr>
              <th>Apoyo de pasaje</th>
              <td>
                {dinero(pasaje)} {t.forma_pago === "dia" || t.forma_pago === "turno" ? "por día trabajado" : "por pago"}
              </td>
            </tr>
          )}
          <tr>
            <th>Forma y día de pago</th>
            <td>En efectivo, contra recibo firmado · {textoDiaPago(datos).toLowerCase()}</td>
          </tr>
        </tbody>
      </table>

      <p>
        <b>Faltas.</b> Toda falta se anota. Las faltas justificadas con pago completo no se descuentan.
        {porFalta !== null &&
          (esSemanaCompleta(datos)
            ? ` Cada falta sin aviso o con permiso sin goce descuenta ${dinero(porFalta)}: el salario del día más la parte proporcional del día de descanso (arts. 69 y 72).`
            : ` Cada falta sin aviso o con permiso sin goce descuenta ${dinero(porFalta)}, la parte proporcional de los días pactados.`)}
        {porFalta === null && " Como el pago es por lo trabajado, los días que no se trabajan no se pagan."}
      </p>
      <p>
        Cualquier cambio en estas condiciones se hará constar en una nueva constancia firmada por ambas partes.
      </p>

      <div className="firmas">
        <div>
          {t.nombre}
          <br />
          Firma o huella del trabajador
        </div>
        <div>
          Por el patrón
          <br />
          Nombre y firma
        </div>
      </div>
    </article>
  );
}

export default async function ImprimirConstancia({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requerirSesion();
  const { id } = await params;
  const { data: t } = await supabase.from("trabajadores").select("*").eq("id", id).maybeSingle<Trabajador>();
  if (!t) notFound();
  const fecha = hoy();
  return (
    <div className="fondo-impresion">
      <div className="barra-impresion no-imprimir">
        <div>
          <h1 style={{ fontSize: 22 }}>Constancia de condiciones de trabajo</h1>
          <div style={{ color: "var(--tenue)" }}>Dos hojas carta: una para el negocio y una para el trabajador.</div>
        </div>
        <div className="acciones">
          <Link className="boton chico" href={`/trabajadores/${t.id}`}>
            Volver
          </Link>
          <BotonImprimirSimple />
        </div>
      </div>
      <Constancia t={t} marca="ORIGINAL" fecha={fecha} />
      <Constancia t={t} marca="COPIA PARA EL TRABAJADOR" fecha={fecha} />
    </div>
  );
}
