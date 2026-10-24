import Link from "next/link";
import { hoy } from "@/lib/fechas";
import { dinero, fechaLarga, folio } from "@/lib/formato";
import { requerirSesion } from "@/lib/sesion";
import type { Adelanto, Trabajador } from "@/lib/tipos";
import { FormularioAdelanto } from "./FormularioAdelanto";

export default async function Adelantos() {
  const { supabase } = await requerirSesion();
  const [{ data: adelantos }, { data: trabajadores }] = await Promise.all([
    supabase
      .from("adelantos")
      .select("*, recibos(folio)")
      .order("fecha", { ascending: false })
      .limit(100)
      .returns<(Adelanto & { recibos: { folio: number } | null })[]>(),
    supabase.from("trabajadores").select("id, nombre").eq("activo", true).order("nombre").returns<Pick<Trabajador, "id" | "nombre">[]>(),
  ]);
  const { data: todos } = await supabase.from("trabajadores").select("id, nombre").returns<Pick<Trabajador, "id" | "nombre">[]>();
  const nombres = new Map((todos ?? []).map((t) => [t.id, t.nombre]));
  const pendiente = (adelantos ?? []).filter((a) => !a.recibo_id).reduce((s, a) => s + Number(a.monto), 0);

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Adelantos</h1>
          <div className="sub">
            Por descontar: {dinero(pendiente)}. Se descuentan al hacer el recibo del trabajador.
          </div>
        </div>
      </div>
      <FormularioAdelanto trabajadores={trabajadores ?? []} hoy={hoy()} />
      <div className="caja tabla-scroll">
        {(adelantos ?? []).length === 0 ? (
          <p className="vacio">No hay adelantos registrados.</p>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Trabajador</th>
                <th>Nota</th>
                <th className="num">Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(adelantos ?? []).map((a) => (
                <tr key={a.id}>
                  <td>{fechaLarga(a.fecha)}</td>
                  <td>{nombres.get(a.trabajador_id) ?? "—"}</td>
                  <td>{a.descripcion ?? "—"}</td>
                  <td className="num">{dinero(Number(a.monto))}</td>
                  <td>
                    {a.recibo_id ? (
                      <Link href={`/recibos/${a.recibo_id}`} className="pastilla ok" style={{ textDecoration: "none" }}>
                        Descontado en folio {a.recibos ? folio(a.recibos.folio) : ""}
                      </Link>
                    ) : (
                      <span className="pastilla aviso">Por descontar</span>
                    )}
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
