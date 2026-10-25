import Link from "next/link";
import { Fragment } from "react";
import { EstadoRecibo } from "@/componentes/EstadoRecibo";
import { EstadoVacio } from "@/componentes/EstadoVacio";
import { IconoDerecha, IconoIzquierda } from "@/componentes/Iconos";
import { esFecha, hoy, semanaDe, sumarDias } from "@/lib/fechas";
import { cantidad, dinero, fechaConDia, folio } from "@/lib/formato";
import { requerirSesion } from "@/lib/sesion";
import { grupoPago, textoDiaPago } from "@/lib/programa";
import { FORMAS_PAGO, TIPOS_TRABAJADOR, UNIDADES, type Recibo, type Trabajador } from "@/lib/tipos";

export default async function Semana({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { supabase } = await requerirSesion();
  const { semana } = await searchParams;
  const { inicio, fin } = semanaDe(esFecha(semana) ? semana : hoy());

  const [{ data: trabajadores }, { data: recibos }] = await Promise.all([
    supabase
      .from("trabajadores")
      .select("id, nombre, tipo, actividad, forma_pago, tarifa, pago_cuando, pago_dia_semana, dias_trabajo, activo")
      .order("nombre")
      .returns<Trabajador[]>(),
    supabase
      .from("recibos")
      .select("id, folio, trabajador_id, forma_pago, cantidad, total, estado")
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
  const filas = (trabajadores ?? [])
    .filter((t) => t.activo || porTrabajador.has(t.id))
    .sort((a, b) => grupoPago(a).orden - grupoPago(b).orden || a.nombre.localeCompare(b.nombre));

  const totalPagado = (recibos ?? []).reduce((s, r) => s + Number(r.total), 0);
  const pagados = filas.filter((t) => porTrabajador.has(t.id)).length;
  const sinFirma = (recibos ?? []).filter((r) => r.estado === "sin_firma").length;

  return (
    <>
      <div className="encabezado">
        <div>
          <span className="antetitulo">
            {fechaConDia(inicio)} al {fechaConDia(fin)} de {fin.slice(0, 4)}
          </span>
          <h1>Pagos de la semana</h1>
        </div>
        <nav className="segmentado" aria-label="Cambiar de semana">
          <Link href={`/semana?semana=${sumarDias(inicio, -7)}`} aria-label="Semana anterior">
            <IconoIzquierda /> <span>Anterior</span>
          </Link>
          <Link href="/semana" aria-current={inicio === semanaDe(hoy()).inicio ? "true" : undefined}>
            Esta semana
          </Link>
          <Link href={`/semana?semana=${sumarDias(inicio, 7)}`} aria-label="Semana siguiente">
            <span>Siguiente</span> <IconoDerecha />
          </Link>
        </nav>
      </div>

      <div className="tarjetas">
        <div className="tarjeta ok">
          <span className="etiqueta">Pagado en la semana</span>
          <span className="valor">{dinero(totalPagado)}</span>
          <span className="nota">{(recibos ?? []).length} recibos</span>
        </div>
        <div className="tarjeta acento">
          <span className="etiqueta">Trabajadores pagados</span>
          <span className="valor">
            {pagados} de {filas.length}
          </span>
          <span className="nota">{filas.length - pagados} pendientes</span>
        </div>
        <div className={`tarjeta${sinFirma ? " alarma" : ""}`}>
          <span className="etiqueta">Recibos sin foto firmada</span>
          <span className="valor">{sinFirma}</span>
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
          <EstadoVacio titulo="Todavía no hay trabajadores">
            <Link className="boton chico" href="/trabajadores/nuevo">
              Agregar el primero
            </Link>
          </EstadoVacio>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Trabajador</th>
                <th scope="col">Lo trabajado</th>
                <th scope="col">Día de pago</th>
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
              {filas.map((t, i) => {
                const grupo = grupoPago(t);
                const nuevoGrupo = i === 0 || grupoPago(filas[i - 1]).clave !== grupo.clave;
                const suyos = porTrabajador.get(t.id) ?? [];
                const total = suyos.reduce((s, r) => s + Number(r.total), 0);
                const estado = suyos.length === 0 ? null : suyos.some((r) => r.estado === "sin_firma") ? "sin_firma" : "firmado";
                return (
                  <Fragment key={t.id}>
                    {nuevoGrupo && (
                      <tr className="fila-grupo">
                        <th colSpan={6} scope="colgroup">
                          {grupo.nombre}
                        </th>
                      </tr>
                    )}
                    <tr>
                      <td className="principal con-lado">
                        <strong>{t.nombre}</strong>
                        <span className="secundario">
                          {TIPOS_TRABAJADOR[t.tipo]}
                          {t.actividad ? ` · ${t.actividad}` : ""}
                        </span>
                      </td>
                      <td data-etiqueta="Lo trabajado">
                        {suyos.length === 0
                          ? `${FORMAS_PAGO[t.forma_pago]} · ${dinero(Number(t.tarifa))}`
                          : suyos.map((r) => `${cantidad(Number(r.cantidad))} ${UNIDADES[r.forma_pago]}`).join(" + ")}
                      </td>
                      <td data-etiqueta="Día de pago">{textoDiaPago(t)}</td>
                      <td className="num lado">{suyos.length ? dinero(total) : "—"}</td>
                      <td data-etiqueta="Estado">
                        {estado ? <EstadoRecibo estado={estado} /> : <span className="pastilla aviso">Pendiente</span>}
                      </td>
                      <td className="acciones-celda">
                        {suyos.map((r) => (
                          <Link key={r.id} href={`/recibos/${r.id}`} className="boton chico">
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
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
