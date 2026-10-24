"use server";

import { revalidatePath } from "next/cache";
import { esFecha } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { TIPOS_FALTA, type TipoFalta } from "@/lib/tipos";

export interface EstadoFalta {
  error: string | null;
  ok: boolean;
}

function revalidar() {
  revalidatePath("/");
  revalidatePath("/faltas");
  revalidatePath("/semana");
}

export async function anotarFalta(_previo: EstadoFalta, form: FormData): Promise<EstadoFalta> {
  const { supabase } = await requerirSesion();
  const trabajadorId = String(form.get("trabajador_id") ?? "");
  const fecha = String(form.get("fecha") ?? "");
  const tipo = String(form.get("tipo") ?? "") as TipoFalta;
  const nota = String(form.get("nota") ?? "").trim();

  if (!trabajadorId) return { error: "Escoge al trabajador.", ok: false };
  if (!esFecha(fecha)) return { error: "La fecha no es válida.", ok: false };
  if (!(tipo in TIPOS_FALTA)) return { error: "Escoge el tipo de falta.", ok: false };

  const { error } = await supabase.from("faltas").insert({
    trabajador_id: trabajadorId,
    fecha,
    tipo,
    fraccion: form.get("media") === "on" ? 0.5 : 1,
    nota: nota || null,
  });
  if (error) {
    if (error.code === "23505") return { error: "Ya hay una falta anotada ese día para este trabajador.", ok: false };
    return { error: error.message, ok: false };
  }
  revalidar();
  return { error: null, ok: true };
}

export async function borrarFalta(id: string): Promise<{ error: string | null }> {
  const { supabase } = await requerirSesion();
  const { data, error } = await supabase.from("faltas").delete().eq("id", id).is("recibo_id", null).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Esa falta ya está en un recibo; para quitarla hay que cancelar el recibo." };
  revalidar();
  return { error: null };
}
