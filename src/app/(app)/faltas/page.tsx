import Link from "next/link";
import { PastillaFalta } from "@/componentes/PastillaFalta";
import { hoy, sumarDias } from "@/lib/fechas";
import { fechaConDia, folio } from "@/lib/formato";
import { faltasSinAviso30 } from "@/lib/programa";
import { requerirSesion } from "@/lib/sesion";
import { TIPOS_FALTA, type Falta, type Trabajador } from "@/lib/tipos";
import { FormularioFalta } from "./FormularioFalta";
import { QuitarFalta } from "./QuitarFalta";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function Faltas({ searchParams }: { searchParams: Promise<{ trabajador?: string }> }) {
  const { supabase } = await requerirSesion();
  const { trabajador } = await searchParams;
  const filtro = trabajador && UUID.test(trabajador) ? trabajador : undefined;
  const hoyMx = hoy();
  const desde = sumarDias(hoyMx, -89);

  let consulta = supabase
    .from("faltas")
    .select("*, recibos(folio, estado)")
    .gte("fecha", desde)
    .order("fecha", { ascending: false });
  if (filtro) consulta = consulta.eq("trabajador_id", filtro);
  const [{ data: faltas }, { data: trabajadores }] = await Promise.all([
    consulta.returns<(Falta & { recibos: { folio: number } | null })[]>(),
    supabase.from("trabajadores").select("id, nombre, activo").order("nombre").returns<Pick<Trabajador, "id" | "nombre" | "activo">[]>(),
  ]);
  const lista = (faltas ?? []).map((f) => ({ ...f, fraccion: Number(f.fraccion) }));
  const nombres = new Map((trabajadores ?? []).map((t) => [t.id, t.nombre]));
  const sinAviso = faltasSinAviso30(lista, hoyMx);
  const enRiesgo = [...sinAviso].filter(([, n]) => n >= 3);

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Faltas</h1>
          <div className="sub">
            Toda falta se anota, se descuente o no. En los de semana fija entran solas al recibo de la semana.
          </div>
        </div>
      </div>

      {enRiesgo.length > 0 && (
        <p className="alerta">
          <strong>3 o más faltas sin aviso en los últimos 30 días:</strong>{" "}
          {enRiesgo.map(([id, n]) => `${nombres.get(id) ?? "—"} (${n})`).join(", ")}. La Ley Federal del Trabajo (art. 47,
          fr. X) considera más de 3 faltas sin permiso en 30 días causa de despido sin responsabilidad para el patrón.
        </p>
      )}

      <FormularioFalta trabajadores={(trabajadores ?? []).filter((t) => t.activo)} hoy={hoyMx} inicial={filtro} />

      <form method="get" className="acciones">
        <label htmlFor="filtro-trabajador">Ver las de</label>
        <select id="filtro-trabajador" name="trabajador" defaultValue={filtro ?? ""}>
          <option value="">Todos</option>
          {(trabajadores ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
        <button type="submit" className="boton chico">
          Ver
        </button>
      </form>

      <div className="caja tabla-scroll">
        {lista.length === 0 ? (
          <p className="vacio">No hay faltas anotadas en los últimos 90 días.</p>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Día</th>
                <th>Trabajador</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Recibo</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id}>
                  <td>{fechaConDia(f.fecha)}</td>
                  <td>
                    <Link href={`/faltas?trabajador=${f.trabajador_id}`}>{nombres.get(f.trabajador_id) ?? "—"}</Link>
                  </td>
                  <td>
                    <PastillaFalta tipo={f.tipo} fraccion={f.fraccion} />
                    <span className="secundario">{TIPOS_FALTA[f.tipo].descuento}</span>
                  </td>
                  <td>{f.nota ?? "—"}</td>
                  <td>
                    {f.recibo_id ? (
                      <Link href={`/recibos/${f.recibo_id}`}>Folio {f.recibos ? folio(f.recibos.folio) : ""}</Link>
                    ) : (
                      <QuitarFalta id={f.id} />
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
