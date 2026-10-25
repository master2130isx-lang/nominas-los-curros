import Link from "next/link";
import { EstadoVacio } from "@/componentes/EstadoVacio";
import { dinero } from "@/lib/formato";
import { textoDiaPago, textoDias } from "@/lib/programa";
import { requerirSesion } from "@/lib/sesion";
import { FORMAS_PAGO, TIPOS_TRABAJADOR, type Trabajador } from "@/lib/tipos";
import { BotonGuia } from "@/componentes/BotonGuia";

export default async function Trabajadores() {
  const { supabase } = await requerirSesion();
  const { data } = await supabase
    .from("trabajadores")
    .select("*")
    .order("activo", { ascending: false })
    .order("nombre")
    .returns<Trabajador[]>();
  const trabajadores = data ?? [];
  return (
    <>
      <div className="encabezado">
        <div>
          <div className="titulo-con-guia">
            <h1>Trabajadores</h1>
            <BotonGuia apartado="trabajadores" />
          </div>
          <div className="sub">{trabajadores.filter((t) => t.activo).length} activos</div>
        </div>
        <Link className="boton primario" href="/trabajadores/nuevo">
          + Agregar trabajador
        </Link>
      </div>
      <div className="caja tabla-scroll">
        {trabajadores.length === 0 ? (
          <EstadoVacio titulo="Todavía no hay trabajadores">
            <Link className="boton chico" href="/trabajadores/nuevo">
              Agregar el primero
            </Link>
          </EstadoVacio>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Forma de pago</th>
                <th className="num">Tarifa</th>
                <th>Día de pago</th>
                <th>Días que trabaja</th>
              </tr>
            </thead>
            <tbody>
              {trabajadores.map((t) => (
                <tr key={t.id} style={t.activo ? undefined : { opacity: 0.6 }}>
                  <td className="principal">
                    <Link href={`/trabajadores/${t.id}`}>
                      <strong>{t.nombre}</strong>
                    </Link>
                    <span className="secundario">
                      {t.actividad ?? ""}
                      {t.activo ? "" : " · dado de baja"}
                    </span>
                  </td>
                  <td data-etiqueta="Tipo">{TIPOS_TRABAJADOR[t.tipo]}</td>
                  <td data-etiqueta="Forma de pago">{FORMAS_PAGO[t.forma_pago]}</td>
                  <td className="num" data-etiqueta="Tarifa">
                    <span>
                      {dinero(Number(t.tarifa))}
                      {Number(t.pasaje) > 0 && <span className="secundario">+ {dinero(Number(t.pasaje))} pasaje</span>}
                    </span>
                  </td>
                  <td data-etiqueta="Día de pago">{textoDiaPago(t)}</td>
                  <td data-etiqueta="Días que trabaja">
                    {textoDias(t.dias_trabajo)}
                    {t.horario && <span className="secundario"> {t.horario}</span>}
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
