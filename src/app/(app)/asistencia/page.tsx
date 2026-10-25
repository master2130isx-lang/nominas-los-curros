import Link from "next/link";
import { EstadoVacio } from "@/componentes/EstadoVacio";
import { IconoDerecha, IconoIzquierda } from "@/componentes/Iconos";
import { TEXTO_FALTA } from "@/componentes/PastillaFalta";
import { esFecha, hoy, semanaDe, sumarDias } from "@/lib/fechas";
import { fechaConDia, folio, rango } from "@/lib/formato";
import { DIAS_SEMANA, iniciales, tonoAvatar, trabajaEse } from "@/lib/programa";
import { requerirSesion } from "@/lib/sesion";
import type { Falta, Recibo, Trabajador } from "@/lib/tipos";
import { CeldaFalta } from "./CeldaFalta";

type TrabajadorSemana = Pick<Trabajador, "id" | "nombre" | "actividad" | "forma_pago" | "dias_trabajo">;
type ReciboSemana = Pick<Recibo, "id" | "folio" | "trabajador_id" | "periodo_inicio" | "periodo_fin">;

export const metadata = { title: "Asistencia de la semana · Nóminas Los Curros" };

export default async function Asistencia({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { supabase } = await requerirSesion();
  const { semana } = await searchParams;
  const hoyMx = hoy();
  const { inicio, fin } = semanaDe(esFecha(semana) ? semana : hoyMx);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(inicio, i));

  const [{ data: trabajadores }, { data: faltasDatos }, { data: recibos }] = await Promise.all([
    supabase
      .from("trabajadores")
      .select("id, nombre, actividad, forma_pago, dias_trabajo")
      .eq("activo", true)
      .order("nombre")
      .returns<TrabajadorSemana[]>(),
    supabase
      .from("faltas")
      .select("id, trabajador_id, fecha, tipo, fraccion, nota, recibo_id")
      .gte("fecha", inicio)
      .lte("fecha", fin)
      .returns<Omit<Falta, "creado_en">[]>(),
    supabase
      .from("recibos")
      .select("id, folio, trabajador_id, periodo_inicio, periodo_fin")
      .neq("estado", "cancelado")
      .lte("periodo_inicio", fin)
      .gte("periodo_fin", inicio)
      .order("folio")
      .returns<ReciboSemana[]>(),
  ]);
  const lista = trabajadores ?? [];
  const faltas = new Map((faltasDatos ?? []).map((f) => [`${f.trabajador_id}|${f.fecha}`, { ...f, fraccion: Number(f.fraccion) }]));
  const cubre = (trabajadorId: string, dia: string) =>
    (recibos ?? []).find((r) => r.trabajador_id === trabajadorId && r.periodo_inicio <= dia && dia <= r.periodo_fin);
  const cuenta = { sin_aviso: 0, sin_goce: 0, justificada: 0 };
  for (const f of faltas.values()) cuenta[f.tipo] += f.fraccion;
  const esEstaSemana = inicio === semanaDe(hoyMx).inicio;

  return (
    <>
      <div className="encabezado">
        <div>
          <span className="antetitulo">{rango(inicio, fin)}</span>
          <h1>Asistencia de la semana</h1>
          <div className="sub">
            Toca un día para anotar la falta, medio día o quitarla. Aquí se capturan también los días de antes de usar la
            plataforma.
          </div>
        </div>
        <div className="navegacion-dia">
          <nav className="segmentado" aria-label="Cambiar de semana">
            <Link href={`/asistencia?semana=${sumarDias(inicio, -7)}`} aria-label="Semana anterior">
              <IconoIzquierda /> <span>Anterior</span>
            </Link>
            <Link href="/asistencia" aria-current={esEstaSemana ? "true" : undefined}>
              Esta semana
            </Link>
            <Link href={`/asistencia?semana=${sumarDias(inicio, 7)}`} aria-label="Semana siguiente">
              <span>Siguiente</span> <IconoDerecha />
            </Link>
          </nav>
          <form method="get" action="/asistencia">
            <div className="campo">
              <label htmlFor="ir-semana">Ir a la semana del</label>
              <input id="ir-semana" type="date" name="semana" defaultValue={inicio} max={hoyMx} />
            </div>
            <button type="submit" className="boton chico">
              Ir
            </button>
          </form>
        </div>
      </div>

      <div className="tarjetas">
        <div className="tarjeta alarma">
          <span className="etiqueta">Faltas sin aviso</span>
          <span className="valor">{cuenta.sin_aviso}</span>
          <span className="nota">Se descuenta el día y el descanso</span>
        </div>
        <div className="tarjeta">
          <span className="etiqueta">Permisos sin goce</span>
          <span className="valor">{cuenta.sin_goce}</span>
          <span className="nota">Solo se descuenta el día</span>
        </div>
        <div className="tarjeta">
          <span className="etiqueta">Justificadas</span>
          <span className="valor">{cuenta.justificada}</span>
          <span className="nota">Se pagan completas</span>
        </div>
      </div>

      <ul className="leyenda" aria-label="Qué significa cada color">
        <li>
          <span className="muestra-celda" aria-hidden="true" /> Día de trabajo
        </li>
        <li>
          <span className="muestra-celda libre" aria-hidden="true" /> Descanso (también se puede anotar)
        </li>
        <li>
          <span className="muestra-celda sin_aviso" aria-hidden="true" /> Sin aviso
        </li>
        <li>
          <span className="muestra-celda sin_goce" aria-hidden="true" /> Sin goce
        </li>
        <li>
          <span className="muestra-celda pagado" aria-hidden="true" /> Ya pagado en un recibo
        </li>
      </ul>

      {lista.length === 0 ? (
        <div className="caja">
          <EstadoVacio titulo="Todavía no hay trabajadores activos">
            <Link className="boton chico" href="/trabajadores/nuevo">
              Agregar trabajador
            </Link>
          </EstadoVacio>
        </div>
      ) : (
        <div className="caja asistencia-caja">
          <table className="asistencia">
            <caption className="sr-only">Asistencia del {rango(inicio, fin)}, por trabajador y día</caption>
            <thead>
              <tr>
                <th scope="col">Trabajador</th>
                {dias.map((d, i) => (
                  <th key={d} scope="col" className={d === hoyMx ? "hoy-col" : undefined}>
                    <abbr title={fechaConDia(d)}>{DIAS_SEMANA[i].slice(0, 3)}</abbr>
                    <span className="num-dia">{Number(d.slice(8))}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => (
                <tr key={t.id}>
                  <th scope="row">
                    <span className="quien">
                      <span className={`avatar tono-${tonoAvatar(t.nombre)}`} aria-hidden="true">
                        {iniciales(t.nombre)}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <strong>{t.nombre}</strong>
                        <span className="secundario">
                          {t.dias_trabajo.length === 0 ? "Sin días de trabajo marcados" : (t.actividad ?? "")}
                        </span>
                      </span>
                    </span>
                  </th>
                  {dias.map((d, i) => {
                    const f = faltas.get(`${t.id}|${d}`);
                    const recibo = cubre(t.id, d);
                    const libre = !trabajaEse(t, d);
                    const corto = DIAS_SEMANA[i].slice(0, 3);
                    const encabezadoMovil = (
                      <span className="dia-movil" aria-hidden="true">
                        <span>{corto.slice(0, 2)}</span> {Number(d.slice(8))}
                      </span>
                    );
                    if (d > hoyMx) {
                      return (
                        <td key={d}>
                          <span className="celda futuro" aria-label={`${fechaConDia(d)}: todavía no llega`}>
                            {encabezadoMovil}
                          </span>
                        </td>
                      );
                    }
                    if (recibo || f?.recibo_id) {
                      const id = recibo?.id ?? f!.recibo_id!;
                      const numero = recibo ? folio(recibo.folio) : "";
                      return (
                        <td key={d}>
                          <Link
                            className={`celda pagado${f ? ` falta ${f.tipo}` : ""}`}
                            href={`/recibos/${id}`}
                            aria-label={`${t.nombre}, ${fechaConDia(d)}: ya pagado${numero ? ` en el recibo folio ${numero}` : ""}${
                              f ? `, con falta ${TEXTO_FALTA[f.tipo]}` : ""
                            }. No se puede marcar.`}
                          >
                            {encabezadoMovil}
                            <span className="estado largo">{f ? TEXTO_FALTA[f.tipo] : "Pagado"}</span>
                            {numero && <span className="estado">F{numero}</span>}
                          </Link>
                        </td>
                      );
                    }
                    return (
                      <td key={d}>
                        <CeldaFalta
                          trabajadorId={t.id}
                          nombre={t.nombre}
                          fecha={d}
                          semanaFija={t.forma_pago === "semana"}
                          libre={libre}
                          falta={f ? { id: f.id, tipo: f.tipo, fraccion: f.fraccion, nota: f.nota } : undefined}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="ayuda" style={{ margin: 0 }}>
        Los días que ya están en un recibo no se pueden marcar: para corregirlos, el administrador cancela el recibo y se
        hace uno nuevo. ¿Buscas una lista? Está en <Link href="/faltas">Faltas</Link>.
      </p>
    </>
  );
}
