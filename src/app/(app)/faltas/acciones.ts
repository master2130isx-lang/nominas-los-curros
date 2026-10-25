"use server";

import { revalidatePath } from "next/cache";
import { traducirError } from "@/lib/errores";
import { esFecha } from "@/lib/fechas";
import { folio as fmtFolio } from "@/lib/formato";
import { requerirSesion } from "@/lib/sesion";
import { TIPOS_FALTA, type TipoFalta } from "@/lib/tipos";
import { esUuid } from "@/lib/validacion";

export interface EstadoFalta {
  error: string | null;
  ok: boolean;
  /** Recibo vigente que ya cubre ese día: la falta no se guardó. */
  recibo?: { id: string; folio: string };
}

function revalidar() {
  revalidatePath("/");
  revalidatePath("/faltas");
  revalidatePath("/semana");
  revalidatePath("/asistencia");
}

function leerTipo(form: FormData): TipoFalta | null {
  const tipo = String(form.get("tipo") ?? "");
  return tipo in TIPOS_FALTA ? (tipo as TipoFalta) : null;
}

export async function anotarFalta(_previo: EstadoFalta, form: FormData): Promise<EstadoFalta> {
  const { supabase } = await requerirSesion();
  const trabajadorId = String(form.get("trabajador_id") ?? "");
  const fecha = String(form.get("fecha") ?? "");
  const tipo = leerTipo(form);
  const nota = String(form.get("nota") ?? "").trim().slice(0, 120);

  if (!trabajadorId) return { error: "Escoge al trabajador.", ok: false };
  if (!esUuid(trabajadorId)) return { error: "El trabajador no es válido. Vuelve a escogerlo.", ok: false };
  if (!esFecha(fecha)) return { error: "La fecha no es válida.", ok: false };
  if (!tipo) return { error: "Escoge el tipo de falta.", ok: false };

  // Si ya hay un recibo vigente que cubre ese día, la falta nunca se descontaría:
  // se avisa con el folio en lugar de guardarla.
  const { data: cubre, error: errorRecibo } = await supabase
    .from("recibos")
    .select("id, folio")
    .eq("trabajador_id", trabajadorId)
    .neq("estado", "cancelado")
    .lte("periodo_inicio", fecha)
    .gte("periodo_fin", fecha)
    .order("folio")
    .limit(1)
    .maybeSingle<{ id: string; folio: number }>();
  if (errorRecibo) return { error: traducirError(errorRecibo), ok: false };
  if (cubre) {
    const folio = fmtFolio(cubre.folio);
    return {
      error: `Ese día ya está pagado en el recibo folio ${folio}. Para anotar la falta hay que cancelar ese recibo y hacer uno nuevo.`,
      ok: false,
      recibo: { id: cubre.id, folio },
    };
  }

  const { error } = await supabase.from("faltas").insert({
    trabajador_id: trabajadorId,
    fecha,
    tipo,
    fraccion: form.get("media") === "on" ? 0.5 : 1,
    nota: nota || null,
  });
  if (error) return { error: traducirError(error), ok: false };
  revalidar();
  return { error: null, ok: true };
}

/** Corrige tipo, medio día y motivo de una falta que todavía no está en un recibo. */
export async function editarFalta(_previo: EstadoFalta, form: FormData): Promise<EstadoFalta> {
  const { supabase } = await requerirSesion();
  const id = String(form.get("id") ?? "");
  const tipo = leerTipo(form);
  const nota = String(form.get("nota") ?? "").trim().slice(0, 120);

  if (!esUuid(id)) return { error: "La falta no es válida.", ok: false };
  if (!tipo) return { error: "Escoge el tipo de falta.", ok: false };

  const { data, error } = await supabase
    .from("faltas")
    .update({ tipo, fraccion: form.get("media") === "on" ? 0.5 : 1, nota: nota || null })
    .eq("id", id)
    .is("recibo_id", null)
    .select("id");
  if (error) return { error: traducirError(error), ok: false };
  if (!data?.length) {
    return { error: "Esa falta ya está en un recibo; para cambiarla hay que cancelar el recibo.", ok: false };
  }
  revalidar();
  return { error: null, ok: true };
}

export async function borrarFalta(id: string): Promise<{ error: string | null }> {
  const { supabase } = await requerirSesion();
  if (!esUuid(id)) return { error: "La falta no es válida." };
  const { data, error } = await supabase.from("faltas").delete().eq("id", id).is("recibo_id", null).select("id");
  if (error) return { error: traducirError(error) };
  if (!data?.length) return { error: "Esa falta ya está en un recibo; para quitarla hay que cancelar el recibo." };
  revalidar();
  return { error: null };
}
