import Link from "next/link";
import { notFound } from "next/navigation";
import { dinero, fechaLarga } from "@/lib/formato";
import { compararConMinimo, descuentoPorFalta, esSemanaCompleta, salarioDiario, SALARIO_MINIMO_DIARIO } from "@/lib/ley";
import { requerirSesion } from "@/lib/sesion";
import type { Trabajador } from "@/lib/tipos";
import { FormularioTrabajador } from "../FormularioTrabajador";
import { SubirConstancia } from "./SubirConstancia";

export default async function EditarTrabajador({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requerirSesion();
  const { id } = await params;
  const { data: datos } = await supabase.from("trabajadores").select("*").eq("id", id).maybeSingle<Trabajador>();
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
  let constanciaUrl: string | null = null;
  if (t.constancia_foto_path) {
    const { data } = await supabase.storage.from("recibos-firmados").createSignedUrl(t.constancia_foto_path, 600);
    constanciaUrl = data?.signedUrl ?? null;
  }

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

      <FormularioTrabajador trabajador={t} />
    </>
  );
}
