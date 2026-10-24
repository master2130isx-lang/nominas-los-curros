import Link from "next/link";
import { EstadoRecibo } from "@/componentes/EstadoRecibo";
import { esFecha, hoy, sumarDias } from "@/lib/fechas";
import { dinero, fechaConDia, folio } from "@/lib/formato";
import {
  cantidadSugerida,
  leTocaCobrar,
  pendientesAnteriores,
  periodoSugerido,
  reciboQueCubre,
  textoDiaPago,
} from "@/lib/programa";
import { requerirSesion } from "@/lib/sesion";
import type { Adelanto, Recibo, Trabajador } from "@/lib/tipos";
import { FORMAS_PAGO } from "@/lib/tipos";
import { LoteDelDia, type FilaLote } from "./LoteDelDia";

function titulo(fecha: string, hoyMx: string) {
  if (fecha === hoyMx) return "Hoy";
  if (fecha === sumarDias(hoyMx, -1)) return "Ayer";
  if (fecha === sumarDias(hoyMx, 1)) return "Mañana";
  return "Pagos del día";
}

export default async function Hoy({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const { supabase } = await requerirSesion();
  const { fecha: f } = await searchParams;
  const hoyMx = hoy();
  const fecha = esFecha(f) ? f : hoyMx;

  const [{ data: trabajadores }, { data: recibos }, { data: adelantos }] = await Promise.all([
    supabase.from("trabajadores").select("*").eq("activo", true).order("nombre").returns<Trabajador[]>(),
    supabase
      .from("recibos")
      .select("*")
      .neq("estado", "cancelado")
      .gte("periodo_fin", sumarDias(fecha, -14))
      .lte("periodo_inicio", sumarDias(fecha, 7))
      .order("folio")
      .returns<Recibo[]>(),
    supabase.from("adelantos").select("trabajador_id, monto").is("recibo_id", null).returns<Pick<Adelanto, "trabajador_id" | "monto">[]>(),
  ]);
  const activos = (trabajadores ?? []).map((t) => ({
    ...t,
    tarifa: Number(t.tarifa),
    pasaje: Number(t.pasaje),
    alta: hoy(new Date(t.creado_en)),
  }));
  const lista = recibos ?? [];

  const lesToca = activos.filter((t) => leTocaCobrar(t, fecha));
  const porCobrar = lesToca.filter((t) => !reciboQueCubre(lista, t.id, fecha));
  const pagados = lista.filter((r) => r.fecha_pago === fecha);
  const pendientes = pendientesAnteriores(activos, lista, fecha);
  const sinDias = activos.filter((t) => t.pago_cuando !== "dia_semana" && t.dias_trabajo.length === 0);
  const adelantoPendiente = new Map<string, number>();
  for (const a of adelantos ?? []) adelantoPendiente.set(a.trabajador_id, (adelantoPendiente.get(a.trabajador_id) ?? 0) + Number(a.monto));

  const filasLote: FilaLote[] = porCobrar.map((t) => {
    const p = periodoSugerido(t, fecha);
    return {
      trabajadorId: t.id,
      nombre: t.nombre,
      actividad: t.actividad,
      formaPago: t.forma_pago,
      tarifa: t.tarifa,
      pasaje: t.pasaje,
      cantidad: cantidadSugerida(t),
      periodoInicio: p.inicio,
      periodoFin: p.fin,
      adelantoPendiente: adelantoPendiente.get(t.id) ?? 0,
    };
  });

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>{titulo(fecha, hoyMx)}</h1>
          <div className="sub">
            {fechaConDia(fecha)} de {fecha.slice(0, 4)}
          </div>
        </div>
        <div className="navegacion-dia">
          <Link className="boton chico" href={`/?fecha=${sumarDias(fecha, -1)}`}>
            ← Día anterior
          </Link>
          {fecha !== hoyMx && (
            <Link className="boton chico" href="/">
              Hoy
            </Link>
          )}
          <Link className="boton chico" href={`/?fecha=${sumarDias(fecha, 1)}`}>
            Día siguiente →
          </Link>
          <form method="get">
            <label htmlFor="ir-fecha" className="sr-only">
              Ir a una fecha
            </label>
            <input id="ir-fecha" type="date" name="fecha" defaultValue={fecha} />
            <button type="submit" className="boton chico">
              Ir
            </button>
          </form>
        </div>
      </div>

      <div className="tarjetas">
        <div className="tarjeta">
          <span className="etiqueta">Les toca cobrar</span>
          <span className="valor">{lesToca.length}</span>
          <span className="nota">{porCobrar.length} todavía sin recibo</span>
        </div>
        <div className="tarjeta">
          <span className="etiqueta">Pagado este día</span>
          <span className="valor">{dinero(pagados.reduce((s, r) => s + Number(r.total), 0))}</span>
          <span className="nota">{pagados.length} recibos</span>
        </div>
        <div className="tarjeta">
          <span className="etiqueta">Pendientes de días anteriores</span>
          <span className="valor" style={{ color: pendientes.length ? "var(--error-texto)" : undefined }}>
            {pendientes.length}
          </span>
          <span className="nota">De los últimos 7 días</span>
        </div>
      </div>

      {sinDias.length > 0 && (
        <p className="alerta aviso">
          {sinDias.length === 1 ? "Hay 1 trabajador" : `Hay ${sinDias.length} trabajadores`} sin días de trabajo
          marcados, así que no aparecen aquí: {sinDias.map((t, i) => (
            <span key={t.id}>
              {i > 0 && ", "}
              <Link href={`/trabajadores/${t.id}`}>{t.nombre}</Link>
            </span>
          ))}
          .
        </p>
      )}

      <section className="seccion">
        <h2>
          Por cobrar <span className="cuenta">{porCobrar.length}</span>
        </h2>
        {porCobrar.length === 0 ? (
          <p className="caja vacio">{lesToca.length ? "Todos los de este día ya tienen recibo." : "A nadie le toca cobrar este día."}</p>
        ) : (
          <LoteDelDia filas={filasLote} fecha={fecha} />
        )}
      </section>

      <section className="seccion">
        <h2>
          Recibos de este día <span className="cuenta">{pagados.length}</span>
        </h2>
        {pagados.length === 0 ? (
          <p className="caja vacio">Todavía no hay recibos con fecha de pago de este día.</p>
        ) : (
          <div className="caja tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Trabajador</th>
                  <th className="num">Total</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagados.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/recibos/${r.id}`}>{folio(r.folio)}</Link>
                    </td>
                    <td>{r.trabajador_nombre}</td>
                    <td className="num">{dinero(Number(r.total))}</td>
                    <td>
                      <EstadoRecibo estado={r.estado} />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <Link className="boton chico" href={`/imprimir?ids=${r.id}`}>
                        {r.impresiones ? "Reimprimir" : "Imprimir"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagados.length > 1 && (
          <div>
            <Link className="boton" href={`/imprimir?ids=${pagados.map((r) => r.id).join(",")}`}>
              Imprimir todos los de este día
            </Link>
          </div>
        )}
      </section>

      {pendientes.length > 0 && (
        <section className="seccion">
          <h2>
            Pendientes de días anteriores <span className="cuenta">{pendientes.length}</span>
          </h2>
          <p style={{ margin: 0, color: "var(--tenue)" }}>
            Les tocaba cobrar y no tienen recibo. Si no vinieron, ignóralos por ahora; pronto se podrá marcar la falta.
          </p>
          <div className="caja tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Trabajador</th>
                  <th>Cobra</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map(({ trabajador: t, fecha: dia }) => (
                  <tr key={`${t.id}-${dia}`}>
                    <td>{fechaConDia(dia)}</td>
                    <td>
                      <strong>{t.nombre}</strong>
                      <span className="secundario">{t.actividad ?? ""}</span>
                    </td>
                    <td>
                      {FORMAS_PAGO[t.forma_pago]} · {dinero(t.tarifa)}
                      <span className="secundario">{textoDiaPago(t)}</span>
                    </td>
                    <td>
                      <Link className="boton chico" href={`/recibos/nuevo?trabajador=${t.id}&fecha=${dia}`}>
                        Hacer recibo
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
