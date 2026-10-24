import Link from "next/link";
import { EstadoRecibo } from "@/componentes/EstadoRecibo";
import { esFecha, hoy, semanaDe, sumarDias } from "@/lib/fechas";
import { cantidad, dinero, fechaConDia, folio } from "@/lib/formato";
import { requerirSesion } from "@/lib/sesion";
import { FORMAS_PAGO, TIPOS_TRABAJADOR, UNIDADES, type Recibo, type Trabajador } from "@/lib/tipos";

export default async function PagosDeLaSemana({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { supabase } = await requerirSesion();
  const { semana } = await searchParams;
  const { inicio, fin } = semanaDe(esFecha(semana) ? semana : hoy());

  const [{ data: trabajadores }, { data: recibos }] = await Promise.all([
    supabase.from("trabajadores").select("*").order("nombre").returns<Trabajador[]>(),
    supabase
      .from("recibos")
      .select("*")
      .gte("fecha_pago", inicio)
      .lte("fecha_pago", fin)
      .neq("estado", "cancelado")
      .order("folio")
      .returns<Recibo[]>(),
  ]);

  const porTrabajador = new Map<string, Recibo[]>();
  for (const r of recibos ?? []) {
    porTrabajador.set(r.trabajador_id, [...(porTrabajador.get(r.trabajador_id) ?? []), r]);
  }
  const filas = (trabajadores ?? []).filter((t) => t.activo || porTrabajador.has(t.id));

  const totalPagado = (recibos ?? []).reduce((s, r) => s + Number(r.total), 0);
  const pagados = filas.filter((t) => porTrabajador.has(t.id)).length;
  const sinFirma = (recibos ?? []).filter((r) => r.estado === "sin_firma").length;

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Pagos de la semana</h1>
          <div className="sub">
            {fechaConDia(inicio)} al {fechaConDia(fin)} de {fin.slice(0, 4)}
          </div>
        </div>
        <div className="acciones">
          <Link className="boton chico" href={`/?semana=${sumarDias(inicio, -7)}`} aria-label="Semana anterior">
            ← Anterior
          </Link>
          <Link className="boton chico" href="/">
            Esta semana
          </Link>
          <Link className="boton chico" href={`/?semana=${sumarDias(inicio, 7)}`} aria-label="Semana siguiente">
            Siguiente →
          </Link>
        </div>
      </div>

      <div className="tarjetas">
        <div className="tarjeta">
          <span className="etiqueta">Pagado en la semana</span>
          <span className="valor">{dinero(totalPagado)}</span>
          <span className="nota">{(recibos ?? []).length} recibos</span>
        </div>
        <div className="tarjeta">
          <span className="etiqueta">Trabajadores pagados</span>
          <span className="valor">
            {pagados} de {filas.length}
          </span>
          <span className="nota">{filas.length - pagados} pendientes</span>
        </div>
        <div className="tarjeta">
          <span className="etiqueta">Recibos sin foto firmada</span>
          <span className="valor" style={{ color: sinFirma ? "var(--error-texto)" : undefined }}>
            {sinFirma}
          </span>
          <span className="nota">Sube la foto del recibo firmado</span>
        </div>
      </div>

      <div className="acciones">
        <Link className="boton primario" href="/recibos/nuevo">
          + Nuevo recibo
        </Link>
        <Link className="boton" href={`/imprimir?semana=${inicio}`}>
          Imprimir recibos de la semana
        </Link>
      </div>

      <div className="caja tabla-scroll">
        {filas.length === 0 ? (
          <p className="vacio">
            Todavía no hay trabajadores. <Link href="/trabajadores/nuevo">Agrega el primero</Link>.
          </p>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Lo trabajado</th>
                <th>Día de pago</th>
                <th className="num">Total</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map((t) => {
                const suyos = porTrabajador.get(t.id) ?? [];
                const total = suyos.reduce((s, r) => s + Number(r.total), 0);
                const estado = suyos.length === 0 ? null : suyos.some((r) => r.estado === "sin_firma") ? "sin_firma" : "firmado";
                return (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.nombre}</strong>
                      <span className="secundario">
                        {TIPOS_TRABAJADOR[t.tipo]}
                        {t.actividad ? ` · ${t.actividad}` : ""}
                      </span>
                    </td>
                    <td>
                      {suyos.length === 0
                        ? `${FORMAS_PAGO[t.forma_pago]} · ${dinero(Number(t.tarifa))}`
                        : suyos.map((r) => `${cantidad(Number(r.cantidad))} ${UNIDADES[r.forma_pago]}`).join(" + ")}
                    </td>
                    <td>{t.dia_pago || "—"}</td>
                    <td className="num">{suyos.length ? dinero(total) : "—"}</td>
                    <td>{estado ? <EstadoRecibo estado={estado} /> : <span className="pastilla aviso">Pendiente</span>}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {suyos.map((r) => (
                        <Link key={r.id} href={`/recibos/${r.id}`} className="boton chico" style={{ marginRight: 6 }}>
                          Folio {folio(r.folio)}
                        </Link>
                      ))}
                      {t.activo && (
                        <Link href={`/recibos/nuevo?trabajador=${t.id}`} className="boton chico">
                          {suyos.length ? "Otro recibo" : "Hacer recibo"}
                        </Link>
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
