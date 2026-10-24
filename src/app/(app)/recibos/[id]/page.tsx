import Link from "next/link";
import { notFound } from "next/navigation";
import { EstadoRecibo } from "@/componentes/EstadoRecibo";
import { ReciboHoja } from "@/componentes/ReciboHoja";
import { folio } from "@/lib/formato";
import { cargarRecibos } from "@/lib/recibos";
import { requerirSesion } from "@/lib/sesion";
import type { Recibo } from "@/lib/tipos";
import { CancelarRecibo } from "./CancelarRecibo";
import { SubirFoto } from "./SubirFoto";

export default async function DetalleRecibo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { supabase, perfil } = await requerirSesion();
  const { id } = await params;
  const { nuevo } = await searchParams;
  const { data: recibo } = await supabase.from("recibos").select("*").eq("id", id).maybeSingle<Recibo>();
  if (!recibo) notFound();
  const [{ hoja }] = await cargarRecibos(supabase, [recibo]);

  let fotoUrl: string | null = null;
  if (recibo.foto_path) {
    const { data } = await supabase.storage.from("recibos-firmados").createSignedUrl(recibo.foto_path, 600);
    fotoUrl = data?.signedUrl ?? null;
  }
  const cancelado = recibo.estado === "cancelado";

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Recibo folio {folio(recibo.folio)}</h1>
          <div className="sub" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <EstadoRecibo estado={recibo.estado} />
            <span>
              Impreso {recibo.impresiones} {recibo.impresiones === 1 ? "vez" : "veces"}
            </span>
          </div>
        </div>
        <div className="acciones">
          <Link className="boton chico" href="/">
            Volver a los pagos de hoy
          </Link>
          {!cancelado && (
            <Link className="boton primario" href={`/imprimir?ids=${recibo.id}`}>
              {recibo.impresiones ? "Reimprimir" : "Imprimir"}
            </Link>
          )}
        </div>
      </div>

      {nuevo && !cancelado && (
        <p className="alerta info">
          Recibo guardado. Imprímelo, que lo firme el trabajador y luego sube aquí la foto del recibo firmado.
        </p>
      )}
      {cancelado && (
        <p className="alerta">
          Cancelado{recibo.motivo_cancelacion ? `: ${recibo.motivo_cancelacion}` : ""}. Ya no cuenta en los pagos de la
          semana.
        </p>
      )}

      <div className="dos-columnas">
        <div className="derecha" style={{ flexBasis: 560 }}>
          <ReciboHoja datos={hoja} sello={cancelado ? "CANCELADO" : undefined} />
        </div>
        <div className="izquierda formulario">
          <section className="caja relleno formulario">
            <h2>Recibo firmado</h2>
            {fotoUrl ? (
              <>
                <a href={fotoUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fotoUrl}
                    alt={`Foto del recibo ${folio(recibo.folio)} firmado`}
                    style={{ width: "100%", borderRadius: 8, border: "1px solid var(--borde)" }}
                  />
                </a>
                <span style={{ fontSize: 13, color: "var(--tenue)" }}>El enlace de la foto dura 10 minutos.</span>
              </>
            ) : cancelado ? (
              <p style={{ margin: 0 }}>Este recibo está cancelado.</p>
            ) : (
              <SubirFoto reciboId={recibo.id} />
            )}
          </section>
          {perfil.rol === "admin" && !cancelado && (
            <section className="caja relleno formulario">
              <h2>Cancelar recibo</h2>
              <p style={{ margin: 0, color: "var(--tenue)" }}>
                Úsalo si hay un error. El recibo queda guardado como cancelado, los abonos regresan al saldo, las
                faltas vuelven a quedar pendientes y puedes hacer uno nuevo.
              </p>
              <CancelarRecibo reciboId={recibo.id} />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
