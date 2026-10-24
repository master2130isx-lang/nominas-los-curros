"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { esFecha } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";

export interface EstadoFormulario {
  error: string | null;
}

interface DatosRecibo {
  trabajadorId: string;
  periodoInicio: string;
  periodoFin: string;
  fechaPago: string;
  cantidad: number;
  extras: { tipo: string; descripcion: string; importe: number }[];
  adelantos: string[];
  nota: string;
}

export async function crearRecibo(_previo: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { supabase } = await requerirSesion();
  let datos: DatosRecibo;
  try {
    datos = JSON.parse(String(form.get("datos")));
  } catch {
    return { error: "No se pudieron leer los datos del formulario." };
  }
  if (!datos.trabajadorId) return { error: "Escoge al trabajador." };
  if (![datos.periodoInicio, datos.periodoFin, datos.fechaPago].every(esFecha)) {
    return { error: "Revisa las fechas del periodo y del pago." };
  }
  if (datos.periodoFin < datos.periodoInicio) return { error: "El periodo termina antes de empezar." };
  if (!(datos.cantidad > 0)) return { error: "Escribe cuánto se trabajó (mayor a cero)." };

  const { data, error } = await supabase
    .rpc("crear_recibo", {
      p_trabajador_id: datos.trabajadorId,
      p_periodo_inicio: datos.periodoInicio,
      p_periodo_fin: datos.periodoFin,
      p_fecha_pago: datos.fechaPago,
      p_cantidad: datos.cantidad,
      p_extras: datos.extras.filter((e) => Number(e.importe) > 0),
      p_adelantos: datos.adelantos,
      p_nota: datos.nota,
    })
    .single<{ id: string }>();
  if (error || !data) return { error: error?.message ?? "No se pudo guardar el recibo." };

  revalidatePath("/");
  redirect(`/recibos/${data.id}?nuevo=1`);
}

export async function cancelarRecibo(_previo: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { supabase, perfil } = await requerirSesion();
  if (perfil.rol !== "admin") return { error: "Solo el administrador puede cancelar recibos." };
  const id = String(form.get("id"));
  const motivo = String(form.get("motivo") ?? "").trim();
  if (!motivo) return { error: "Escribe por qué se cancela." };
  const { error } = await supabase.rpc("cancelar_recibo", { p_recibo_id: id, p_motivo: motivo });
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath(`/recibos/${id}`);
  return { error: null };
}

export async function marcarFirmado(id: string, ruta: string): Promise<EstadoFormulario> {
  const { supabase } = await requerirSesion();
  const { error } = await supabase.rpc("marcar_firmado", { p_recibo_id: id, p_foto_path: ruta });
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath(`/recibos/${id}`);
  return { error: null };
}

export async function registrarImpresion(ids: string[]): Promise<void> {
  const { supabase } = await requerirSesion();
  await supabase.rpc("registrar_impresion", { p_recibos: ids });
}
