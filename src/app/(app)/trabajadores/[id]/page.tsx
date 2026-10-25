import Link from "next/link";
import { notFound } from "next/navigation";
import { fechaInicio } from "@/lib/fechas";
import { dinero, fechaLarga } from "@/lib/formato";
import { compararConMinimo, descuentoPorFalta, esSemanaCompleta, salarioDiario, SALARIO_MINIMO_DIARIO } from "@/lib/ley";
import { requerirSesion } from "@/lib/sesion";
import { FORMAS_PAGO, type DocumentoTrabajador, type Trabajador } from "@/lib/tipos";
import { esUuid } from "@/lib/validacion";
import { FormularioTrabajador } from "../FormularioTrabajador";
import { SubirConstancia } from "./SubirConstancia";
import { SubirDocumento } from "./SubirDocumento";

interface CambioBitacora {
  id: number;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  cambiado_en: string;
  perfiles: { nombre: string } | null;
}

const CAMPOS: Record<string, string> = {
  alta: "Alta",
  tarifa: "Tarifa",
  pasaje: "Pasaje",
  forma_pago: "Forma de pago",
  activo: "Activo",
  salario_diario: "Salario diario",
};

function valorBitacora(campo: string, valor: string | null): string {
  if (valor === null) return "—";
  if (campo === "tarifa" || campo === "pasaje" || campo === "salario_diario") return dinero(Number(valor));
  if (campo === "forma_pago") return FORMAS_PAGO[valor as keyof typeof FORMAS_PAGO] ?? valor;
  if (campo === "activo") return valor === "true" ? "Sí" : "Dado de baja";
  if (campo === "alta") {
    const [forma, tarifa] = valor.split(" ");
    return `${FORMAS_PAGO[forma as keyof typeof FORMAS_PAGO] ?? forma} · ${dinero(Number(tarifa))}`;
  }
  return valor;
}

const fechaHora = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function EditarTrabajador({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, perfil } = await requerirSesion();
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const [{ data: datos }, { data: bitacora }, { data: documentos }] = await Promise.all([
    supabase.from("trabajadores").select("*").eq("id", id).maybeSingle<Trabajador>(),
    supabase
      .from("trabajadores_bitacora")
      .select("id, campo, valor_anterior, valor_nuevo, cambiado_en, perfiles(nombre)")
      .eq("trabajador_id", id)
      .gte("cambiado_en", fechaInicio())
      .order("cambiado_en", { ascending: false })
      .limit(20)
      .returns<CambioBitacora[]>(),
    supabase
      .from("trabajador_documentos")
      .select("id, trabajador_id, nombre, ruta, subido_en")
      .eq("trabajador_id", id)
      .order("subido_en", { ascending: false })
      .returns<DocumentoTrabajador[]>(),
  ]);
  if (!datos) notFound();
  const t = {
    ...datos,
    tarifa: Number(datos.tarifa),
    pasaje: Number(datos.pasaje),
    horas_dia: datos.horas_dia === null ? null : Number(datos.horas_dia),
  };
  const diario = salarioDiario(t);
  const porFalta = descuentoPorFalta(t);
  const minimo = compararConMinimo(t);
  // Enlaces firmados (10 minutos) para ver los documentos y la constancia, en paralelo.
  const rutas = (documentos ?? []).map((d) => d.ruta);
  const [{ data: firmadas }, { data: constancia }] = await Promise.all([
    rutas.length
      ? supabase.storage.from("recibos-firmados").createSignedUrls(rutas, 600)
      : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
    t.constancia_foto_path
      ? supabase.storage.from("recibos-firmados").createSignedUrl(t.constancia_foto_path, 600)
      : Promise.resolve({ data: null }),
  ]);
  const urlDe = new Map((firmadas ?? []).map((f) => [f.path ?? "", f.signedUrl]));
  const constanciaUrl: string | null = constancia?.signedUrl ?? null;

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>{t.nombre}</h1>
          <div className="sub">
            Cambiar la tarifa solo afecta los recibos nuevos; los ya hechos se quedan como están.
          </div>
        </div>
        <div className="acciones">
          <Link className="boton chico" href={`/recibos?trabajador=${t.id}`}>
            Ver sus recibos
          </Link>
          <Link className="boton chico" href={`/faltas?trabajador=${t.id}`}>
            Ver sus faltas
          </Link>
          <Link className="boton chico" href="/trabajadores">
            Volver
          </Link>
        </div>
      </div>

      <div className="tarjetas" style={{ maxWidth: 760 }}>
        <div className="tarjeta">
          <span className="etiqueta">Salario y faltas</span>
          {diario !== null && porFalta !== null ? (
            <>
              <span className="valor">{dinero(diario)}</span>
              <span className="nota">
                Salario diario ({esSemanaCompleta(t) ? "semanal ÷ 7, el descanso también se paga" : `semanal ÷ ${t.dias_trabajo.length} días pactados`}).
                {esSemanaCompleta(t)
                  ? ` Una falta sin aviso descuenta ${dinero(porFalta)}: el día más ${dinero(porFalta - diario)} del descanso (LFT art. 69 y 72). Con permiso solo se descuenta el día, ${dinero(diario)}.`
                  : ` Una falta sin aviso o con permiso descuenta ${dinero(porFalta)}.`}
              </span>
            </>
          ) : (
            <span className="nota">
              {t.forma_pago === "semana"
                ? "Marca los días que trabaja para calcular su salario diario y sus faltas."
                : "Cobra por lo que trabaja: las faltas se anotan, pero no se descuentan."}
            </span>
          )}
        </div>
        <div className="tarjeta">
          <span className="etiqueta">Comparado con el salario mínimo</span>
          {minimo ? (
            <>
              <span className="valor" style={{ color: minimo.arriba ? "var(--ok-texto)" : "var(--aviso-texto)" }}>
                {dinero(minimo.porHora)} <span style={{ fontSize: 15, fontWeight: 500 }}>por hora</span>
              </span>
              <span className="nota">
                Mínimo proporcional por {minimo.periodo}: {dinero(minimo.minimo)}; se le pagan {dinero(minimo.pago)}.{" "}
                {minimo.arriba ? "Está por encima." : `Está ${dinero(minimo.minimo - minimo.pago)} por debajo.`} (Mínimo 2026:{" "}
                {dinero(SALARIO_MINIMO_DIARIO)} por 8 horas.)
              </span>
            </>
          ) : (
            <span className="nota">
              {t.forma_pago === "tarea" ? "Cobra por tarea; no se compara por hora." : "Anota las horas por día pactadas para compararlo."}
            </span>
          )}
        </div>
        <div className="tarjeta">
          <span className="etiqueta">Constancia de condiciones de trabajo</span>
          {t.constancia_firmada_en ? (
            <span className="nota">
              <span className="pastilla ok">Firmada</span> Subida el {fechaLarga(t.constancia_firmada_en)}.{" "}
              {constanciaUrl && (
                <a href={constanciaUrl} target="_blank" rel="noreferrer">
                  Ver foto
                </a>
              )}
            </span>
          ) : (
            <span className="nota">
              <span className="pastilla aviso">Sin firmar</span> Imprímela, que la firme y sube la foto. Deja por escrito su
              jornada y su sueldo (LFT art. 24 y 25).
            </span>
          )}
          <div className="acciones" style={{ marginTop: 6 }}>
            <Link className="boton chico" href={`/constancia/${t.id}`}>
              {t.constancia_firmada_en ? "Volver a imprimir" : "Imprimir constancia"}
            </Link>
          </div>
          <SubirConstancia trabajadorId={t.id} />
        </div>
      </div>

      <FormularioTrabajador trabajador={t} esAdmin={perfil.rol === "admin"} />

      <section className="caja relleno formulario" style={{ maxWidth: 820 }} aria-labelledby="titulo-documentos">
        <div>
          <h2 id="titulo-documentos">Documentos del expediente</h2>
          <p className="ayuda" style={{ margin: "4px 0 0" }}>
            INE, comprobante de domicilio, contrato, alta en el IMSS… Se guardan en el espacio privado; no se borran.
          </p>
        </div>
        {(documentos ?? []).length === 0 ? (
          <p className="ayuda" style={{ margin: 0 }}>
            Todavía no hay documentos.
          </p>
        ) : (
          <ul className="bitacora">
            {(documentos ?? []).map((d) => (
              <li key={d.id}>
                <span>
                  <strong>{d.nombre}</strong>
                  {urlDe.get(d.ruta) && (
                    <>
                      {" · "}
                      <a href={urlDe.get(d.ruta) ?? undefined} target="_blank" rel="noreferrer">
                        Ver
                      </a>
                    </>
                  )}
                </span>
                <span className="cuando">Subido el {fechaHora.format(new Date(d.subido_en))}</span>
              </li>
            ))}
          </ul>
        )}
        <SubirDocumento trabajadorId={t.id} />
      </section>

      <section className="caja relleno formulario" style={{ maxWidth: 820 }} aria-labelledby="titulo-bitacora">
        <div>
          <h2 id="titulo-bitacora">Historial de cambios</h2>
          <p className="ayuda" style={{ margin: "4px 0 0" }}>
            Tarifa, pasaje, forma de pago y bajas: quién los cambió y cuándo. No se puede editar.
          </p>
        </div>
        {(bitacora ?? []).length === 0 ? (
          <p className="ayuda" style={{ margin: 0 }}>
            Sin cambios registrados todavía.
          </p>
        ) : (
          <ul className="bitacora">
            {(bitacora ?? []).map((c) => (
              <li key={c.id}>
                <span>
                  <strong>{CAMPOS[c.campo] ?? c.campo}</strong>:{" "}
                  {c.campo === "alta"
                    ? valorBitacora(c.campo, c.valor_nuevo)
                    : `${valorBitacora(c.campo, c.valor_anterior)} → ${valorBitacora(c.campo, c.valor_nuevo)}`}
                </span>
                <span className="cuando">
                  {c.perfiles?.nombre ?? "Desde Supabase"} · {fechaHora.format(new Date(c.cambiado_en))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
