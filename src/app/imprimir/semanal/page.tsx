import Link from "next/link";
import { BotonImprimirSimple } from "@/app/constancia/[id]/BotonImprimirSimple";
import { desdeInicio, esFecha, hoy, semanaDe, sumarDias } from "@/lib/fechas";
import { dinero, fechaLarga, rango } from "@/lib/formato";
import { pesosConLetra } from "@/lib/letras";
import { NEGOCIO } from "@/lib/negocio";
import { DIAS_SEMANA, diaIso, textoDias } from "@/lib/programa";
import { requerirSesion } from "@/lib/sesion";
import type { Recibo, Trabajador } from "@/lib/tipos";
import { SubirHojaSemanal } from "./SubirHojaSemanal";
import "@/app/recibo.css";

type TrabajadorDiario = Pick<Trabajador, "id" | "nombre" | "actividad" | "horario" | "dias_trabajo" | "alimentacion" | "activo">;

export const metadata = { title: "Hoja semanal para firmar · Nóminas Los Curros" };

/**
 * Los que cobran cada día firman una sola vez por semana: cada renglón es un
 * trabajador con lo que se le pagó cada día, el total y su firma de conformidad.
 */
export default async function HojaSemanal({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { supabase } = await requerirSesion();
  const { semana } = await searchParams;
  const { inicio: lunes, fin } = semanaDe(desdeInicio(esFecha(semana) ? semana : hoy()));
  const desde = desdeInicio(lunes);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).filter((d) => d >= desde);

  const [{ data: trabajadores }, { data: recibos }] = await Promise.all([
    supabase
      .from("trabajadores")
      .select("id, nombre, actividad, horario, dias_trabajo, alimentacion, activo")
      .eq("pago_cuando", "cada_dia")
      .order("nombre")
      .returns<TrabajadorDiario[]>(),
    supabase
      .from("recibos")
      .select("id, trabajador_id, fecha_pago, total, estado")
      .neq("estado", "cancelado")
      .gte("fecha_pago", desde)
      .lte("fecha_pago", fin)
      .returns<Pick<Recibo, "id" | "trabajador_id" | "fecha_pago" | "total" | "estado">[]>(),
  ]);
  const pagado = new Map<string, number>();
  for (const r of recibos ?? []) {
    const k = `${r.trabajador_id}|${r.fecha_pago}`;
    pagado.set(k, (pagado.get(k) ?? 0) + Number(r.total));
  }
  const conPagos = new Set((recibos ?? []).map((r) => r.trabajador_id));
  const filas = (trabajadores ?? []).filter((t) => t.activo || conPagos.has(t.id));
  const totalDe = (id: string) => dias.reduce((s, d) => s + (pagado.get(`${id}|${d}`) ?? 0), 0);
  const totalDia = (d: string) => filas.reduce((s, t) => s + (pagado.get(`${t.id}|${d}`) ?? 0), 0);
  const granTotal = filas.reduce((s, t) => s + totalDe(t.id), 0);
  const sinFirmar = (recibos ?? []).filter((r) => r.estado === "sin_firma" && filas.some((t) => t.id === r.trabajador_id)).length;

  return (
    <div className="fondo-impresion">
      <div className="barra-impresion no-imprimir" style={{ maxWidth: "11in" }}>
        <div>
          <h1 style={{ fontSize: 22 }}>Hoja semanal para firmar</h1>
          <div style={{ color: "var(--tenue)" }}>
            Quienes cobran cada día firman una sola vez, aquí, al final de la semana · carta horizontal
          </div>
        </div>
        <div className="acciones">
          <Link className="boton chico" href={`/semana?semana=${lunes}`}>
            Volver
          </Link>
          <BotonImprimirSimple />
        </div>
      </div>

      <article className="semanal" aria-label={`Hoja semanal del ${rango(desde, fin)}`}>
        <header className="cabeza">
          <div>
            <strong>{NEGOCIO.nombre}</strong>
            {NEGOCIO.rfc && <span>RFC {NEGOCIO.rfc}</span>}
            {NEGOCIO.registroPatronal && <span>Registro patronal IMSS {NEGOCIO.registroPatronal}</span>}
            <span>{NEGOCIO.domicilio}</span>
          </div>
          <div className="derecha">
            <strong>Hoja semanal de pagos diarios</strong>
            <span>Del {rango(desde, fin)}</span>
            <span>Se firma el {fechaLarga(fin)}</span>
          </div>
        </header>
        <p>
          <b>Condiciones de trabajo:</b> lugar de trabajo {NEGOCIO.nombre}, {NEGOCIO.domicilio}; horario el anotado con
          cada nombre; alimentación durante la jornada sin costo para el trabajador (prestación en especie), salvo donde se
          indique.
        </p>
        <table>
          <thead>
            <tr>
              <th scope="col">Trabajador</th>
              {dias.map((d) => (
                <th key={d} scope="col">
                  {DIAS_SEMANA[diaIso(d) - 1].slice(0, 3)} {Number(d.slice(8))}
                </th>
              ))}
              <th scope="col">Total</th>
              <th scope="col" className="firma-col">
                Firma de conformidad
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={dias.length + 3}>Nadie cobra cada día.</td>
              </tr>
            ) : (
              filas.map((t) => (
                <tr key={t.id}>
                  <td>
                    <b>{t.nombre}</b>
                    <small>
                      {t.actividad ?? ""}
                      {t.horario ? ` · ${t.horario}` : ""}
                      {t.dias_trabajo.length ? ` · ${textoDias(t.dias_trabajo).toLowerCase()}` : ""}
                      {t.alimentacion ? "" : " · sin alimentación"}
                    </small>
                  </td>
                  {dias.map((d) => {
                    const monto = pagado.get(`${t.id}|${d}`);
                    return (
                      <td key={d} className="monto">
                        {monto ? dinero(monto) : "—"}
                      </td>
                    );
                  })}
                  <td className="total">
                    {totalDe(t.id) > 0 ? (
                      <>
                        {dinero(totalDe(t.id))}
                        <small>{pesosConLetra(totalDe(t.id))}</small>
                      </>
                    ) : (
                      <small>Sin pagos esta semana</small>
                    )}
                  </td>
                  <td className="firma" />
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td>Total del día</td>
              {dias.map((d) => (
                <td key={d} className="monto">
                  {totalDia(d) ? dinero(totalDia(d)) : "—"}
                </td>
              ))}
              <td className="total">{dinero(granTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
        <div className="pie">
          <p>
            Con mi firma hago constar que recibí en efectivo, a mi entera conformidad, las cantidades anotadas en mi
            renglón por los días trabajados de esta semana, y que estoy conforme con las condiciones de trabajo descritas.
          </p>
          <div className="linea">Por el patrón: {NEGOCIO.nombre}</div>
        </div>
      </article>

      <div className="no-imprimir" style={{ maxWidth: "11in", margin: "0 auto" }}>
        <section className="caja relleno formulario">
          <h2>Hoja firmada</h2>
          <p style={{ margin: 0, color: "var(--tenue)" }}>
            {sinFirmar === 0
              ? "No hay recibos diarios pendientes de firma en esta semana."
              : `Hay ${sinFirmar} ${sinFirmar === 1 ? "recibo diario" : "recibos diarios"} de esta semana sin firma. Sube la foto de la hoja firmada y quedan como firmados.`}
          </p>
          {sinFirmar > 0 && <SubirHojaSemanal lunes={lunes} />}
        </section>
      </div>
    </div>
  );
}
