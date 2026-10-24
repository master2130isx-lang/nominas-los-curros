"use server";

import { revalidatePath } from "next/cache";
import { esFecha } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import type { EstadoFormulario } from "../recibos/acciones";

export async function registrarAdelanto(_previo: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { supabase } = await requerirSesion();
  const trabajadorId = String(form.get("trabajador") ?? "");
  const monto = Number(form.get("monto"));
  const fecha = String(form.get("fecha") ?? "");
  const descripcion = String(form.get("descripcion") ?? "").trim() || null;
  if (!trabajadorId) return { error: "Escoge al trabajador." };
  if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
  if (!esFecha(fecha)) return { error: "La fecha no es válida." };
  const { error } = await supabase.from("adelantos").insert({ trabajador_id: trabajadorId, monto, fecha, descripcion });
  if (error) return { error: error.message };
  revalidatePath("/adelantos");
  return { error: null };
}
