import Link from "next/link";
import { EstadoRecibo } from "@/componentes/EstadoRecibo";
import { dinero, fechaLarga, folio, rango } from "@/lib/formato";
import { requerirSesion } from "@/lib/sesion";
import type { EstadoRecibo as Estado, Recibo, Trabajador } from "@/lib/tipos";

const ESTADOS: Estado[] = ["sin_firma", "firmado", "cancelado"];

export default async function Recibos({
  searchParams,
}: {
  searchParams: Promise<{ trabajador?: string; estado?: string }>;
}) {
  const { supabase } = await requerirSesion();
  const filtros = await searchParams;
  let consulta = supabase.from("recibos").select("*").order("folio", { ascending: false }).limit(200);
  if (filtros.trabajador) consulta = consulta.eq("trabajador_id", filtros.trabajador);
  if (filtros.estado && ESTADOS.includes(filtros.estado as Estado)) consulta = consulta.eq("estado", filtros.estado);
  const [{ data: recibos }, { data: trabajadores }] = await Promise.all([
    consulta.returns<Recibo[]>(),
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
      <form className="acciones" method="get">
        <div className="campo" style={{ minWidth: 220 }}>
          <label htmlFor="f-trabajador">Trabajador</label>
          <select id="f-trabajador" name="trabajador" defaultValue={filtros.trabajador ?? ""}>
            <option value="">Todos</option>
            {(trabajadores ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="campo" style={{ minWidth: 200 }}>
          <label htmlFor="f-estado">Estado</label>
          <select id="f-estado" name="estado" defaultValue={filtros.estado ?? ""}>
            <option value="">Todos</option>
            <option value="sin_firma">Sin foto firmada</option>
            <option value="firmado">Firmados</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>
        <button type="submit" className="boton" style={{ alignSelf: "flex-end" }}>
          Filtrar
        </button>
      </form>
      <div className="caja tabla-scroll">
        {(recibos ?? []).length === 0 ? (
          <p className="vacio">No hay recibos con esos filtros.</p>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Trabajador</th>
                <th>Periodo</th>
                <th>Pagado el</th>
                <th className="num">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(recibos ?? []).map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/recibos/${r.id}`}>{folio(r.folio)}</Link>
                  </td>
                  <td>{r.trabajador_nombre}</td>
                  <td>{rango(r.periodo_inicio, r.periodo_fin)}</td>
                  <td>{fechaLarga(r.fecha_pago)}</td>
                  <td className="num">{dinero(Number(r.total))}</td>
                  <td>
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
