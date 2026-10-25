"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { traducirError } from "@/lib/errores";
import { esFecha } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { esUuid } from "@/lib/validacion";

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
  abono: number;
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
  if (!esUuid(datos.trabajadorId)) return { error: "El trabajador no es válido. Vuelve a escogerlo." };
  if (!Array.isArray(datos.extras)) return { error: "No se pudieron leer los extras del recibo." };
  if (![datos.periodoInicio, datos.periodoFin, datos.fechaPago].every(esFecha)) {
    return { error: "Revisa las fechas del periodo y del pago." };
  }
  if (datos.periodoFin < datos.periodoInicio) return { error: "El periodo termina antes de empezar." };
  if (!(datos.cantidad > 0)) return { error: "Escribe cuánto se trabajó (mayor a cero)." };
  if (!(Number(datos.abono) >= 0)) return { error: "El abono no puede ser negativo." };

  const { data, error } = await supabase
    .rpc("crear_recibo", {
      p_trabajador_id: datos.trabajadorId,
      p_periodo_inicio: datos.periodoInicio,
      p_periodo_fin: datos.periodoFin,
      p_fecha_pago: datos.fechaPago,
      p_cantidad: datos.cantidad,
      p_extras: datos.extras.filter((e) => Number(e.importe) > 0),
      p_abono: Number(datos.abono) || 0,
      p_nota: datos.nota,
    })
    .single<{ id: string }>();
  if (error || !data) return { error: traducirError(error, "No se pudo guardar el recibo.") };

  revalidatePath("/");
  redirect(`/recibos/${data.id}?nuevo=1`);
}

export async function cancelarRecibo(_previo: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { supabase, perfil } = await requerirSesion();
  if (perfil.rol !== "admin") return { error: "Solo el administrador puede cancelar recibos." };
  const id = String(form.get("id"));
  const motivo = String(form.get("motivo") ?? "").trim();
  if (!esUuid(id)) return { error: "El recibo no es válido." };
  if (!motivo) return { error: "Escribe por qué se cancela." };
  const { error } = await supabase.rpc("cancelar_recibo", { p_recibo_id: id, p_motivo: motivo });
  if (error) return { error: traducirError(error, "No se pudo cancelar el recibo.") };
  revalidatePath("/");
  revalidatePath(`/recibos/${id}`);
  return { error: null };
}

export async function marcarFirmado(id: string, ruta: string): Promise<EstadoFormulario> {
  const { supabase } = await requerirSesion();
  if (!esUuid(id)) return { error: "El recibo no es válido." };
  const { error } = await supabase.rpc("marcar_firmado", { p_recibo_id: id, p_foto_path: ruta });
  if (error) return { error: traducirError(error, "No se pudo marcar el recibo como firmado.") };
  revalidatePath("/");
  revalidatePath(`/recibos/${id}`);
  return { error: null };
}

export async function registrarImpresion(ids: string[]): Promise<void> {
  const { supabase } = await requerirSesion();
  const validos = ids.filter(esUuid);
  if (validos.length) await supabase.rpc("registrar_impresion", { p_recibos: validos });
}

export interface EstadoLote {
  error: string | null;
  creados: number;
}

interface FilaLoteDatos {
  trabajadorId: string;
  periodoInicio: string;
  periodoFin: string;
  fechaPago: string;
  cantidad: number;
}

/** Varios recibos sin extras de una vez (la vista de Hoy); al terminar abre la impresión. */
export async function crearLote(_previo: EstadoLote, form: FormData): Promise<EstadoLote> {
  const { supabase } = await requerirSesion();
  let filas: FilaLoteDatos[];
  try {
    filas = JSON.parse(String(form.get("datos")));
  } catch {
    return { error: "No se pudieron leer los datos.", creados: 0 };
  }
  if (!Array.isArray(filas) || filas.length === 0) return { error: "Escoge al menos a un trabajador.", creados: 0 };

  const ids: string[] = [];
  for (const f of filas) {
    if (!esUuid(f.trabajadorId) || ![f.periodoInicio, f.periodoFin, f.fechaPago].every(esFecha) || !(f.cantidad > 0)) {
      return { error: "Revisa las cantidades.", creados: ids.length };
    }
    const { data, error } = await supabase
      .rpc("crear_recibo", {
        p_trabajador_id: f.trabajadorId,
        p_periodo_inicio: f.periodoInicio,
        p_periodo_fin: f.periodoFin,
        p_fecha_pago: f.fechaPago,
        p_cantidad: f.cantidad,
      })
      .single<{ id: string }>();
    if (error || !data) {
      revalidatePath("/");
      return { error: traducirError(error, "No se pudo guardar un recibo."), creados: ids.length };
    }
    ids.push(data.id);
  }
  revalidatePath("/");
  redirect(`/imprimir?ids=${ids.join(",")}`);
}
