import Link from "next/link";
import { EstadoRecibo } from "@/componentes/EstadoRecibo";
import { EstadoVacio } from "@/componentes/EstadoVacio";
import { IconoAsistencia, IconoDerecha, IconoIzquierda } from "@/componentes/Iconos";
import { PastillaFalta } from "@/componentes/PastillaFalta";
import { esFecha, hoy, sumarDias } from "@/lib/fechas";
import { dinero, fechaConDia, folio } from "@/lib/formato";
import {
  agruparPendientes,
  cantidadSugerida,
  cobraEseDia,
  DIAS_PENDIENTES,
  faltaDe,
  faltasSinAviso30,
  iniciales,
  pendientesAnteriores,
  periodoSugerido,
  reciboQueCubre,
  textoDiaPago,
  tonoAvatar,
  trabajaEse,
} from "@/lib/programa";
import { requerirSesion } from "@/lib/sesion";
import type { AdelantoSaldo, Falta, Recibo, Trabajador } from "@/lib/tipos";
import { FORMAS_PAGO } from "@/lib/tipos";
import { MarcarFalta } from "./faltas/MarcarFalta";
import { LoteDelDia, type FilaLote } from "./LoteDelDia";

type TrabajadorDia = Pick<
  Trabajador,
  | "id"
  | "nombre"
  | "actividad"
  | "forma_pago"
  | "tarifa"
  | "pasaje"
  | "pago_cuando"
  | "pago_dia_semana"
  | "dias_trabajo"
  | "horas_dia"
  | "fecha_ingreso"
>;
type ReciboDia = Pick<
  Recibo,
  "id" | "folio" | "trabajador_id" | "trabajador_nombre" | "periodo_inicio" | "periodo_fin" | "fecha_pago" | "total" | "estado" | "impresiones"
>;

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

  const [{ data: trabajadores }, { data: recibos }, { data: adelantos }, { data: faltasDatos }] = await Promise.all([
    supabase
      .from("trabajadores")
      .select("id, nombre, actividad, forma_pago, tarifa, pasaje, pago_cuando, pago_dia_semana, dias_trabajo, horas_dia, fecha_ingreso")
      .eq("activo", true)
      .order("nombre")
      .returns<TrabajadorDia[]>(),
    supabase
      .from("recibos")
      .select("id, folio, trabajador_id, trabajador_nombre, periodo_inicio, periodo_fin, fecha_pago, total, estado, impresiones")
      .neq("estado", "cancelado")
      .gte("periodo_fin", sumarDias(fecha, -DIAS_PENDIENTES))
      .lte("periodo_inicio", sumarDias(fecha, 7))
      .order("folio")
      .returns<ReciboDia[]>(),
    supabase.from("adelantos_saldo").select("trabajador_id, saldo").gt("saldo", 0).returns<Pick<AdelantoSaldo, "trabajador_id" | "saldo">[]>(),
    supabase
      .from("faltas")
      .select("id, trabajador_id, fecha, tipo, fraccion, nota, recibo_id")
      .gte("fecha", sumarDias(fecha, -37))
      .lte("fecha", sumarDias(fecha, 7))
      .order("fecha")
      .returns<Omit<Falta, "creado_en">[]>(),
  ]);
  const faltas = (faltasDatos ?? []).map((f) => ({ ...f, fraccion: Number(f.fraccion) }));
  const activos = (trabajadores ?? []).map((t) => ({
    ...t,
    tarifa: Number(t.tarifa),
    pasaje: Number(t.pasaje),
    desde: t.fecha_ingreso,
  }));
  const lista = recibos ?? [];

  const lesToca = activos.filter((t) => cobraEseDia(t, faltas, fecha));
  // Quienes trabajan ese día y, además, quien tenga falta anotada ese día aunque no sea su día.
  const trabajanHoy = activos.filter((t) => trabajaEse(t, fecha) || faltaDe(faltas, t.id, fecha));
  const sinAviso = faltasSinAviso30(faltas, fecha);
  const enRiesgo = activos.filter((t) => (sinAviso.get(t.id) ?? 0) >= 3);
  const porCobrar = lesToca.filter((t) => !reciboQueCubre(lista, t.id, fecha));
  const pagados = lista.filter((r) => r.fecha_pago === fecha);
  const pendientes = pendientesAnteriores(activos, lista, fecha, faltas);
  const grupos = agruparPendientes(pendientes);
  const sinDias = activos.filter((t) => t.pago_cuando !== "dia_semana" && t.dias_trabajo.length === 0);
  const faltaron = trabajanHoy.filter((t) => faltaDe(faltas, t.id, fecha)).length;
  const adelantoPendiente = new Map<string, number>();
  for (const a of adelantos ?? []) adelantoPendiente.set(a.trabajador_id, (adelantoPendiente.get(a.trabajador_id) ?? 0) + Number(a.saldo));
  const semanaAnterior = `/asistencia?semana=${sumarDias(fecha, -1)}`;

  const filasLote: FilaLote[] = porCobrar.map((t) => {
    const p = periodoSugerido(t, fecha);
    const mediaFalta = t.forma_pago === "dia" || t.forma_pago === "turno" ? faltaDe(faltas, t.id, fecha) : undefined;
    const sugerida = cantidadSugerida(t);
    return {
      trabajadorId: t.id,
      nombre: t.nombre,
      actividad: t.actividad,
      formaPago: t.forma_pago,
      tarifa: t.tarifa,
      pasaje: t.pasaje,
      cantidad: sugerida !== null && mediaFalta ? sugerida - mediaFalta.fraccion : sugerida,
      periodoInicio: p.inicio,
      periodoFin: p.fin,
      adelantoPendiente: adelantoPendiente.get(t.id) ?? 0,
      faltas: faltas
        .filter((f) => f.trabajador_id === t.id && !f.recibo_id && f.fecha >= p.inicio && f.fecha <= p.fin)
        .map((f) => ({ fecha: f.fecha, tipo: f.tipo, fraccion: f.fraccion, nota: f.nota })),
      diasTrabajo: t.dias_trabajo,
      horasDia: t.horas_dia === null ? null : Number(t.horas_dia),
    };
  });

  return (
    <>
      <div className="encabezado">
        <div>
          <span className="antetitulo">
            {fechaConDia(fecha)} de {fecha.slice(0, 4)}
          </span>
          <h1>{titulo(fecha, hoyMx)}</h1>
        </div>
        <div className="navegacion-dia">
          <nav className="segmentado" aria-label="Cambiar de día">
            <Link href={`/?fecha=${sumarDias(fecha, -1)}`} aria-label="Día anterior">
              <IconoIzquierda /> <span>Anterior</span>
            </Link>
            <Link href="/" aria-current={fecha === hoyMx ? "true" : undefined}>
              Hoy
            </Link>
            <Link href={`/?fecha=${sumarDias(fecha, 1)}`} aria-label="Día siguiente">
              <span>Siguiente</span> <IconoDerecha />
            </Link>
          </nav>
          <form method="get">
            <div className="campo">
              <label htmlFor="ir-fecha">Ir a una fecha</label>
              <input id="ir-fecha" type="date" name="fecha" defaultValue={fecha} />
            </div>
            <button type="submit" className="boton chico">
              Ir
            </button>
          </form>
        </div>
      </div>

      <div className="tarjetas">
        <div className="tarjeta acento">
          <span className="etiqueta">Les toca cobrar</span>
          <span className="valor">{lesToca.length}</span>
          <span className="nota">
            {porCobrar.length === 0 ? "Todos tienen recibo" : `${porCobrar.length} todavía sin recibo`}
          </span>
        </div>
        <div className="tarjeta ok">
          <span className="etiqueta">Pagado este día</span>
          <span className="valor">{dinero(pagados.reduce((s, r) => s + Number(r.total), 0))}</span>
          <span className="nota">
            {pagados.length} {pagados.length === 1 ? "recibo" : "recibos"}
          </span>
        </div>
        <div className={`tarjeta${pendientes.length ? " alarma" : ""}`}>
          <span className="etiqueta">Pendientes de días anteriores</span>
          <span className="valor">{pendientes.length}</span>
          <span className="nota">
            {pendientes.length ? (
              <a className="cubre" href="#pendientes">
                De los últimos {DIAS_PENDIENTES} días · revisar
              </a>
            ) : (
              `Al corriente en los últimos ${DIAS_PENDIENTES} días`
            )}
          </span>
        </div>
      </div>

      {sinDias.length > 0 && (
        <p className="alerta aviso">
          {sinDias.length === 1 ? "Hay 1 trabajador" : `Hay ${sinDias.length} trabajadores`} sin días de trabajo marcados,
          así que no aparecen en este día:{" "}
          {sinDias.map((t, i) => (
            <span key={t.id}>
              {i > 0 && ", "}
              <Link href={`/trabajadores/${t.id}`}>{t.nombre}</Link>
            </span>
          ))}
          . Sus faltas se anotan en <Link href={semanaAnterior}>Asistencia de la semana</Link>.
        </p>
      )}

      {enRiesgo.length > 0 && (
        <p className="alerta">
          <strong>3 o más faltas sin aviso en 30 días:</strong>{" "}
          {enRiesgo.map((t, i) => (
            <span key={t.id}>
              {i > 0 && ", "}
              <Link href={`/faltas?trabajador=${t.id}`}>
                {t.nombre} ({sinAviso.get(t.id)})
              </Link>
            </span>
          ))}
          . La Ley Federal del Trabajo (art. 47, fr. X) considera más de 3 faltas sin permiso en 30 días causa de despido
          sin responsabilidad para el patrón. Conviene platicarlo con ellos y que cada falta quede en un recibo firmado.
        </p>
      )}

      <section className="seccion" aria-labelledby="titulo-faltas">
        <header>
          <h2 id="titulo-faltas">
            ¿Quién faltó?{" "}
            <span className="cuenta">
              {trabajanHoy.length} trabajan · {faltaron} {faltaron === 1 ? "falta" : "faltas"}
            </span>
          </h2>
          <Link className="boton chico fantasma" href={semanaAnterior}>
            <IconoAsistencia /> Corregir días anteriores
          </Link>
        </header>
        {trabajanHoy.length === 0 ? (
          <div className="caja">
            <EstadoVacio titulo="Nadie tiene marcado este día como día de trabajo">
              <Link className="boton chico" href={semanaAnterior}>
                Anotar faltas en la semana
              </Link>
            </EstadoVacio>
          </div>
        ) : (
          <ul className="personas">
            {trabajanHoy.map((t) => {
              const f = faltaDe(faltas, t.id, fecha);
              return (
                <li key={t.id} className={`persona${f ? ` falto ${f.tipo}` : ""}`}>
                  <span className={`avatar tono-${tonoAvatar(t.nombre)}`} aria-hidden="true">
                    {iniciales(t.nombre)}
                  </span>
                  <span className="quien">
                    <strong>{t.nombre}</strong>
                    {f ? (
                      <>
                        <PastillaFalta tipo={f.tipo} fraccion={f.fraccion} />
                        {f.nota && <span className="secundario">{f.nota}</span>}
                      </>
                    ) : (
                      <span className="secundario">{t.actividad || FORMAS_PAGO[t.forma_pago]}</span>
                    )}
                  </span>
                  {f?.recibo_id ? (
                    <span className="secundario">En recibo</span>
                  ) : (
                    <MarcarFalta
                      trabajadorId={t.id}
                      nombre={t.nombre}
                      fecha={fecha}
                      semanaFija={t.forma_pago === "semana"}
                      falta={f ? { id: f.id, tipo: f.tipo, fraccion: f.fraccion, nota: f.nota } : undefined}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="seccion" aria-labelledby="titulo-cobrar">
        <header>
          <h2 id="titulo-cobrar">
            Por cobrar <span className="cuenta">{porCobrar.length}</span>
          </h2>
        </header>
        {porCobrar.length === 0 ? (
          <div className="caja">
            {lesToca.length ? (
              <EstadoVacio tono="ok" titulo="Todos los de este día ya tienen recibo" />
            ) : (
              <EstadoVacio titulo="A nadie le toca cobrar este día" />
            )}
          </div>
        ) : (
          <LoteDelDia filas={filasLote} fecha={fecha} />
        )}
      </section>

      <section className="seccion" aria-labelledby="titulo-recibos">
        <header>
          <h2 id="titulo-recibos">
            Recibos de este día <span className="cuenta">{pagados.length}</span>
          </h2>
          {pagados.length > 1 && (
            <Link className="boton chico" href={`/imprimir?ids=${pagados.map((r) => r.id).join(",")}`}>
              Imprimir todos
            </Link>
          )}
        </header>
        {pagados.length === 0 ? (
          <div className="caja">
            <EstadoVacio titulo="Todavía no hay recibos de este día" texto="Los que hagas en Por cobrar aparecen aquí." />
          </div>
        ) : (
          <div className="caja tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Trabajador</th>
                  <th scope="col">Folio</th>
                  <th scope="col" className="num">
                    Total
                  </th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagados.map((r) => (
                  <tr key={r.id}>
                    <td className="principal con-lado">
                      <strong>{r.trabajador_nombre}</strong>
                    </td>
                    <td data-etiqueta="Folio">
                      <Link href={`/recibos/${r.id}`}>{folio(r.folio)}</Link>
                    </td>
                    <td className="num lado">{dinero(Number(r.total))}</td>
                    <td data-etiqueta="Estado">
                      <EstadoRecibo estado={r.estado} />
                    </td>
                    <td className="acciones-celda">
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
      </section>

      {grupos.length > 0 && (
        <section className="seccion" id="pendientes" aria-labelledby="titulo-pendientes">
          <header>
            <h2 id="titulo-pendientes">
              Pendientes de días anteriores <span className="cuenta">{pendientes.length}</span>
            </h2>
            <Link className="boton chico fantasma" href={semanaAnterior}>
              <IconoAsistencia /> Ver la semana completa
            </Link>
            <p>
              Les tocaba cobrar y no tienen recibo (últimos {DIAS_PENDIENTES} días, también los de antes de usar la
              plataforma). Si vino, hazle su recibo; si no, márcale la falta.
            </p>
          </header>
          <ul className="pendientes">
            {grupos.map(({ trabajador: t, fechas }) => (
              <li key={t.id} className="caja">
                <div className="quien">
                  <span className={`avatar tono-${tonoAvatar(t.nombre)}`} aria-hidden="true">
                    {iniciales(t.nombre)}
                  </span>
                  <span>
                    <strong>{t.nombre}</strong>
                    <span className="secundario">
                      {FORMAS_PAGO[t.forma_pago]} · {dinero(t.tarifa)} · {textoDiaPago(t)}
                    </span>
                  </span>
                </div>
                <ul className="dias-pendientes" aria-label={`Días sin recibo de ${t.nombre}`}>
                  {fechas.map((dia) => (
                    <li key={dia}>
                      <span className="fecha-pendiente">{fechaConDia(dia)}</span>
                      <Link className="boton chico" href={`/recibos/nuevo?trabajador=${t.id}&fecha=${dia}`}>
                        Recibo
                      </Link>
                      {!faltaDe(faltas, t.id, dia) && (
                        <MarcarFalta trabajadorId={t.id} nombre={t.nombre} fecha={dia} semanaFija={t.forma_pago === "semana"}>
                          Falta
                        </MarcarFalta>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
