import Link from "next/link";
import { EstadoVacio } from "@/componentes/EstadoVacio";
import { hoy } from "@/lib/fechas";
import { dinero, fechaLarga, folio } from "@/lib/formato";
import { requerirSesion } from "@/lib/sesion";
import type { Abono, AdelantoSaldo, Trabajador } from "@/lib/tipos";
import { FormularioAdelanto } from "./FormularioAdelanto";

export default async function Adelantos({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { supabase } = await requerirSesion();
  const { ver } = await searchParams;
  const verPagados = ver === "todos";
  let consulta = supabase.from("adelantos_saldo").select("*").order("fecha", { ascending: false }).limit(200);
  if (!verPagados) consulta = consulta.gt("saldo", 0);
  const [{ data: adelantos }, { data: trabajadores }] = await Promise.all([
    consulta.returns<AdelantoSaldo[]>(),
    supabase.from("trabajadores").select("id, nombre, activo").order("nombre").returns<Pick<Trabajador, "id" | "nombre" | "activo">[]>(),
  ]);
  const lista = adelantos ?? [];
  const { data: abonos } = lista.length
    ? await supabase
        .from("abonos")
        .select("*, recibos(folio, fecha_pago)")
        .in("adelanto_id", lista.map((a) => a.id))
        .order("creado_en")
        .returns<(Abono & { recibos: { folio: number; fecha_pago: string } | null })[]>()
    : { data: [] };
  const nombres = new Map((trabajadores ?? []).map((t) => [t.id, t.nombre]));
  const porPrestamo = new Map<string, NonNullable<typeof abonos>>();
  for (const ab of abonos ?? []) porPrestamo.set(ab.adelanto_id, [...(porPrestamo.get(ab.adelanto_id) ?? []), ab]);
  const totalDebe = lista.reduce((s, a) => s + Number(a.saldo), 0);

  // Saldo por trabajador, para verlo de un vistazo.
  const porTrabajador = new Map<string, number>();
  for (const a of lista) if (Number(a.saldo) > 0) porTrabajador.set(a.trabajador_id, (porTrabajador.get(a.trabajador_id) ?? 0) + Number(a.saldo));

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Préstamos y adelantos</h1>
          <div className="sub">
            Le deben al negocio {dinero(totalDebe)}. En cada recibo se anota lo que el trabajador quiere abonar; puede ser
            $0.
          </div>
        </div>
        <div className="acciones">
          <Link className="boton chico" href={verPagados ? "/adelantos" : "/adelantos?ver=todos"}>
            {verPagados ? "Solo los que deben" : "Ver también los ya pagados"}
          </Link>
        </div>
      </div>

      {porTrabajador.size > 0 && (
        <div className="tarjetas">
          {[...porTrabajador].map(([id, saldo]) => (
            <div className="tarjeta" key={id}>
              <span className="etiqueta">{nombres.get(id) ?? "—"}</span>
              <span className="valor">{dinero(saldo)}</span>
              <span className="nota">
                <Link href={`/recibos/nuevo?trabajador=${id}`}>Hacer recibo con abono</Link>
              </span>
            </div>
          ))}
        </div>
      )}

      <FormularioAdelanto trabajadores={(trabajadores ?? []).filter((t) => t.activo)} hoy={hoy()} />

      <div className="caja tabla-scroll">
        {lista.length === 0 ? (
          <EstadoVacio tono={verPagados ? undefined : "ok"} titulo={verPagados ? "No hay préstamos registrados" : "Nadie debe nada"} />
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Trabajador</th>
                <th className="num">Prestado</th>
                <th>Abonos</th>
                <th className="num">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => {
                const suyos = porPrestamo.get(a.id) ?? [];
                return (
                  <tr key={a.id}>
                    <td data-etiqueta="Fecha">
                      <span>
                        {fechaLarga(a.fecha)}
                        {a.descripcion && <span className="secundario">{a.descripcion}</span>}
                      </span>
                    </td>
                    <td className="principal" style={{ order: -1 }}>
                      <strong>{nombres.get(a.trabajador_id) ?? "—"}</strong>
                    </td>
                    <td className="num" data-etiqueta="Prestado">
                      {dinero(Number(a.monto))}
                    </td>
                    <td data-etiqueta="Abonos">
                      {suyos.length === 0 ? (
                        <span className="secundario">Sin abonos todavía</span>
                      ) : (
                        <span>
                        {suyos.map((ab) => (
                          <span key={ab.id} className="secundario">
                            {dinero(Number(ab.monto))} el {ab.recibos ? fechaLarga(ab.recibos.fecha_pago) : "—"} ·{" "}
                            <Link href={`/recibos/${ab.recibo_id}`}>folio {ab.recibos ? folio(ab.recibos.folio) : ""}</Link>
                          </span>
                        ))}
                        </span>
                      )}
                    </td>
                    <td className="num" data-etiqueta="Saldo">
                      {Number(a.saldo) > 0 ? (
                        <strong>{dinero(Number(a.saldo))}</strong>
                      ) : (
                        <span className="pastilla ok">Pagado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
