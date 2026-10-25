import Link from "next/link";
import { EstadoVacio } from "@/componentes/EstadoVacio";
import { PastillaFalta } from "@/componentes/PastillaFalta";
import { esFecha, hoy, sumarDias } from "@/lib/fechas";
import { fechaConDia, fechaLarga, folio } from "@/lib/formato";
import { faltasSinAviso30 } from "@/lib/programa";
import { requerirSesion } from "@/lib/sesion";
import { TIPOS_FALTA, type Falta, type Trabajador } from "@/lib/tipos";
import { leerFiltroTrabajador } from "@/lib/validacion";
import { FormularioFalta } from "./FormularioFalta";
import { MarcarFalta } from "./MarcarFalta";

const POR_PAGINA = 50;

export default async function Faltas({
  searchParams,
}: {
  searchParams: Promise<{ trabajador?: string; desde?: string; hasta?: string; pagina?: string }>;
}) {
  const { supabase } = await requerirSesion();
  const params = await searchParams;
  const filtro = leerFiltroTrabajador(params.trabajador);
  const hoyMx = hoy();
  const desde = esFecha(params.desde) ? params.desde : sumarDias(hoyMx, -89);
  const hasta = esFecha(params.hasta) ? params.hasta : hoyMx;
  const pagina = Math.max(1, Math.floor(Number(params.pagina)) || 1);

  let consulta = supabase
    .from("faltas")
    .select("id, trabajador_id, fecha, tipo, fraccion, nota, recibo_id, recibos(folio)", { count: "exact" })
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  if (filtro.id) consulta = consulta.eq("trabajador_id", filtro.id);
  const [{ data: faltas, count }, { data: trabajadores }, { data: recientes }] = await Promise.all([
    filtro.invalido
      ? Promise.resolve({ data: [], count: 0 })
      : consulta.returns<(Omit<Falta, "creado_en"> & { recibos: { folio: number } | null })[]>(),
    supabase
      .from("trabajadores")
      .select("id, nombre, activo, forma_pago")
      .order("nombre")
      .returns<Pick<Trabajador, "id" | "nombre" | "activo" | "forma_pago">[]>(),
    // Para el aviso de 3 faltas sin aviso en 30 días, sin importar el filtro.
    supabase
      .from("faltas")
      .select("trabajador_id, fecha, tipo, fraccion")
      .eq("tipo", "sin_aviso")
      .gte("fecha", sumarDias(hoyMx, -29))
      .returns<Pick<Falta, "trabajador_id" | "fecha" | "tipo" | "fraccion">[]>(),
  ]);
  const lista = (faltas ?? []).map((f) => ({ ...f, fraccion: Number(f.fraccion) }));
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const datosTrabajador = new Map((trabajadores ?? []).map((t) => [t.id, t]));
  const sinAviso = faltasSinAviso30(recientes ?? [], hoyMx);
  const enRiesgo = [...sinAviso].filter(([, n]) => n >= 3);
  const enlace = (cambios: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const todo = { trabajador: filtro.id, desde, hasta, pagina: undefined, ...cambios };
    for (const [k, v] of Object.entries(todo)) if (v !== undefined && v !== "") q.set(k, String(v));
    return `/faltas?${q}`;
  };

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Faltas</h1>
          <div className="sub">
            Toda falta se anota, se descuente o no. En los de semana fija entran solas al recibo de la semana.
          </div>
        </div>
        <Link className="boton" href="/asistencia">
          Asistencia de la semana
        </Link>
      </div>

      {enRiesgo.length > 0 && (
        <p className="alerta">
          <strong>3 o más faltas sin aviso en los últimos 30 días:</strong>{" "}
          {enRiesgo.map(([id, n]) => `${datosTrabajador.get(id)?.nombre ?? "—"} (${n})`).join(", ")}. La Ley Federal del
          Trabajo (art. 47, fr. X) considera más de 3 faltas sin permiso en 30 días causa de despido sin responsabilidad para
          el patrón.
        </p>
      )}

      <FormularioFalta trabajadores={(trabajadores ?? []).filter((t) => t.activo)} hoy={hoyMx} inicial={filtro.id} />

      <section className="seccion" aria-labelledby="titulo-lista">
        <header>
          <h2 id="titulo-lista">
            Faltas anotadas <span className="cuenta">{total}</span>
          </h2>
        </header>
        <form method="get" className="caja filtros" role="search" aria-label="Filtrar faltas">
          <div className="campo">
            <label htmlFor="filtro-trabajador">Trabajador</label>
            <select id="filtro-trabajador" name="trabajador" defaultValue={filtro.id ?? ""}>
              <option value="">Todos</option>
              {(trabajadores ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="filtro-desde">Desde</label>
            <input id="filtro-desde" type="date" name="desde" defaultValue={desde} max={hasta} />
          </div>
          <div className="campo">
            <label htmlFor="filtro-hasta">Hasta</label>
            <input id="filtro-hasta" type="date" name="hasta" defaultValue={hasta} />
          </div>
          <button type="submit" className="boton">
            Ver
          </button>
        </form>

        {filtro.invalido && (
          <p className="alerta aviso" role="alert">
            El trabajador del enlace no es válido. <Link href="/faltas">Ver las faltas de todos</Link>.
          </p>
        )}

        {lista.length === 0 ? (
          <div className="caja">
            <EstadoVacio
              titulo={filtro.invalido ? "Sin resultados" : "No hay faltas en estas fechas"}
              texto={`Del ${fechaLarga(desde)} al ${fechaLarga(hasta)}. Cambia las fechas para ver otras.`}
            />
          </div>
        ) : (
          <div className="caja tabla-scroll">
            <table className="tabla">
              <caption className="sr-only">
                Faltas del {fechaLarga(desde)} al {fechaLarga(hasta)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Trabajador</th>
                  <th scope="col">Día</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Recibo</th>
                  <th scope="col">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((f) => {
                  const t = datosTrabajador.get(f.trabajador_id);
                  return (
                    <tr key={f.id}>
                      <td className="principal">
                        <Link href={enlace({ trabajador: f.trabajador_id })}>
                          <strong>{t?.nombre ?? "—"}</strong>
                        </Link>
                      </td>
                      <td data-etiqueta="Día">{fechaConDia(f.fecha)}</td>
                      <td data-etiqueta="Tipo">
                        <span>
                          <PastillaFalta tipo={f.tipo} fraccion={f.fraccion} />
                          {t?.forma_pago === "semana" && <span className="secundario">{TIPOS_FALTA[f.tipo].descuento}</span>}
                        </span>
                      </td>
                      <td data-etiqueta="Motivo">{f.nota ?? "—"}</td>
                      <td data-etiqueta="Recibo">
                        {f.recibo_id ? (
                          <Link href={`/recibos/${f.recibo_id}`}>Folio {f.recibos ? folio(f.recibos.folio) : ""}</Link>
                        ) : (
                          <span className="pastilla gris">Pendiente</span>
                        )}
                      </td>
                      <td className="acciones-celda">
                        {!f.recibo_id && t && (
                          <MarcarFalta
                            trabajadorId={f.trabajador_id}
                            nombre={t.nombre}
                            fecha={f.fecha}
                            semanaFija={t.forma_pago === "semana"}
                            falta={{ id: f.id, tipo: f.tipo, fraccion: f.fraccion, nota: f.nota }}
                            etiqueta={`Editar la falta de ${t.nombre} del ${fechaConDia(f.fecha)}`}
                          >
                            Editar
                          </MarcarFalta>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {paginas > 1 && (
          <nav className="paginacion" aria-label="Páginas de faltas">
            <span>
              Página {pagina} de {paginas}
            </span>
            <span className="acciones">
              {pagina > 1 && (
                <Link className="boton chico" href={enlace({ pagina: pagina - 1 })} rel="prev">
                  ← Más recientes
                </Link>
              )}
              {pagina < paginas && (
                <Link className="boton chico" href={enlace({ pagina: pagina + 1 })} rel="next">
                  Más antiguas →
                </Link>
              )}
            </span>
          </nav>
        )}
        {!params.desde && (
          <p className="ayuda" style={{ margin: 0 }}>
            Se muestran los últimos 90 días.{" "}
            <Link href={enlace({ desde: sumarDias(hoyMx, -364) })}>Ver todo el último año</Link> o escoge otras fechas.
          </p>
        )}
      </section>
    </>
  );
}
