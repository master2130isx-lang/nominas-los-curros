import Link from "next/link";
import { EstadoRecibo } from "@/componentes/EstadoRecibo";
import { EstadoVacio } from "@/componentes/EstadoVacio";
import { dinero, fechaLarga, folio, rango } from "@/lib/formato";
import { requerirSesion } from "@/lib/sesion";
import type { EstadoRecibo as Estado, Recibo, Trabajador } from "@/lib/tipos";
import { leerFiltroTrabajador } from "@/lib/validacion";

const ESTADOS: Estado[] = ["sin_firma", "firmado", "cancelado"];

export default async function Recibos({
  searchParams,
}: {
  searchParams: Promise<{ trabajador?: string; estado?: string }>;
}) {
  const { supabase } = await requerirSesion();
  const filtros = await searchParams;
  const filtro = leerFiltroTrabajador(filtros.trabajador);
  let consulta = supabase
    .from("recibos")
    .select("id, folio, trabajador_nombre, periodo_inicio, periodo_fin, fecha_pago, total, estado")
    .order("folio", { ascending: false })
    .limit(200);
  if (filtro.id) consulta = consulta.eq("trabajador_id", filtro.id);
  if (filtros.estado && ESTADOS.includes(filtros.estado as Estado)) consulta = consulta.eq("estado", filtros.estado);
  const [{ data: recibos }, { data: trabajadores }] = await Promise.all([
    filtro.invalido ? Promise.resolve({ data: [] as Recibo[] }) : consulta.returns<Recibo[]>(),
    supabase.from("trabajadores").select("id, nombre").order("nombre").returns<Pick<Trabajador, "id" | "nombre">[]>(),
  ]);

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Recibos</h1>
          <div className="sub">Los últimos 200, del más nuevo al más viejo.</div>
        </div>
      </div>
      <form className="caja filtros" method="get" role="search" aria-label="Filtrar recibos">
        <div className="campo">
          <label htmlFor="f-trabajador">Trabajador</label>
          <select id="f-trabajador" name="trabajador" defaultValue={filtro.id ?? ""}>
            <option value="">Todos</option>
            {(trabajadores ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="f-estado">Estado</label>
          <select id="f-estado" name="estado" defaultValue={filtros.estado ?? ""}>
            <option value="">Todos</option>
            <option value="sin_firma">Sin foto firmada</option>
            <option value="firmado">Firmados</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>
        <button type="submit" className="boton">
          Filtrar
        </button>
      </form>
      {filtro.invalido && (
        <p className="alerta aviso" role="alert">
          El trabajador del enlace no es válido. <Link href="/recibos">Ver los recibos de todos</Link>.
        </p>
      )}
      <div className="caja tabla-scroll">
        {(recibos ?? []).length === 0 ? (
          <EstadoVacio titulo="No hay recibos con esos filtros" />
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Trabajador</th>
                <th scope="col">Folio</th>
                <th scope="col">Periodo</th>
                <th scope="col">Pagado el</th>
                <th scope="col" className="num">
                  Total
                </th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(recibos ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="principal con-lado">
                    <strong>{r.trabajador_nombre}</strong>
                  </td>
                  <td data-etiqueta="Folio">
                    <Link href={`/recibos/${r.id}`}>{folio(r.folio)}</Link>
                  </td>
                  <td data-etiqueta="Periodo">{rango(r.periodo_inicio, r.periodo_fin)}</td>
                  <td data-etiqueta="Pagado el">{fechaLarga(r.fecha_pago)}</td>
                  <td className="num lado">{dinero(Number(r.total))}</td>
                  <td data-etiqueta="Estado">
                    <EstadoRecibo estado={r.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
