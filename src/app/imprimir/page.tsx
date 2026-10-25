import Link from "next/link";
import { ReciboHoja } from "@/componentes/ReciboHoja";
import { desdeInicio, esFecha, semanaDe } from "@/lib/fechas";
import { rango } from "@/lib/formato";
import { cargarRecibos } from "@/lib/recibos";
import { requerirSesion } from "@/lib/sesion";
import type { Recibo } from "@/lib/tipos";
import { BotonImprimir } from "./BotonImprimir";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function Imprimir({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; semana?: string; copia?: string }>;
}) {
  const { supabase } = await requerirSesion();
  const filtros = await searchParams;
  const conCopia = filtros.copia !== "no";

  let titulo = "Imprimir recibo";
  let recibos: Recibo[] = [];
  if (filtros.semana && esFecha(filtros.semana)) {
    const { inicio: lunes, fin } = semanaDe(desdeInicio(filtros.semana));
    const inicio = desdeInicio(lunes);
    titulo = `Recibos de la semana del ${rango(inicio, fin)}`;
    const { data } = await supabase
      .from("recibos")
      .select("*")
      .gte("fecha_pago", inicio)
      .lte("fecha_pago", fin)
      .neq("estado", "cancelado")
      .order("folio")
      .returns<Recibo[]>();
    recibos = data ?? [];
  } else {
    const ids = (filtros.ids ?? "").split(",").filter((x) => UUID.test(x));
    if (ids.length) {
      const { data } = await supabase.from("recibos").select("*").in("id", ids).order("folio").returns<Recibo[]>();
      recibos = data ?? [];
    }
  }
  const completos = await cargarRecibos(supabase, recibos);
  const imprimibles = completos.filter((c) => c.recibo.estado !== "cancelado");
  const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v) as [string, string][]);
  params.set("copia", conCopia ? "no" : "si");

  return (
    <div style={{ padding: "24px 16px", background: "var(--fondo)", minHeight: "100vh" }}>
      <div className="barra-impresion no-imprimir">
        <div>
          <h1 style={{ fontSize: 22 }}>{titulo}</h1>
          <div style={{ color: "var(--tenue)" }}>
            {imprimibles.length} {imprimibles.length === 1 ? "recibo" : "recibos"} · hoja carta,{" "}
            {conCopia ? "una hoja para el original y otra para la copia del trabajador" : "una hoja por recibo, sin copia"}
          </div>
        </div>
        <div className="acciones">
          <Link className="boton chico" href="/">
            Volver
          </Link>
          <Link className="boton chico" href={`/imprimir?${params}`}>
            {conCopia ? "Sin copia" : "Con copia"}
          </Link>
          <BotonImprimir ids={imprimibles.map((c) => c.recibo.id)} />
        </div>
      </div>
      {imprimibles.length === 0 ? (
        <p className="vacio no-imprimir">No hay recibos para imprimir.</p>
      ) : (
        imprimibles.flatMap(({ recibo, hoja }) => {
          const re = recibo.impresiones > 0 ? "REIMPRESIÓN · " : "";
          const hojas = conCopia ? [`${re}ORIGINAL`, `${re}COPIA PARA EL TRABAJADOR`] : [re ? "REIMPRESIÓN" : "ORIGINAL"];
          return hojas.map((marca) => (
            <div className="pliego" key={`${recibo.id}-${marca}`}>
              <ReciboHoja datos={hoja} marca={marca} />
            </div>
          ));
        })
      )}
    </div>
  );
}
