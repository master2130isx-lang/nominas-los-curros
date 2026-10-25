"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { esFecha, hoy } from "@/lib/fechas";
import { horasEntre, textoHorario } from "@/lib/horario";
import { requerirSesion } from "@/lib/sesion";
import { FORMAS_PAGO, TIPOS_TRABAJADOR, type PagoCuando } from "@/lib/tipos";

const PAGO_CUANDO: PagoCuando[] = ["dia_semana", "cada_dia", "al_terminar"];
import type { EstadoFormulario } from "../recibos/acciones";

const texto = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

export async function guardarTrabajador(_previo: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { supabase } = await requerirSesion();
  const id = texto(form, "id");
  const nombre = texto(form, "nombre");
  const tipo = String(form.get("tipo"));
  const formaPago = String(form.get("forma_pago"));
  const tarifa = Number(form.get("tarifa"));
  const pasaje = Number(form.get("pasaje") || 0);
  const fechaIngreso = texto(form, "fecha_ingreso");
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  const entrada = texto(form, "hora_entrada");
  const salida = texto(form, "hora_salida");
  const horarioAnterior = texto(form, "horario_anterior");
  const pagoCuando = String(form.get("pago_cuando")) as PagoCuando;
  const pagoDia = Number(form.get("pago_dia_semana"));
  const diasTrabajo = [...new Set(form.getAll("dias_trabajo").map(Number))]
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
    .sort((a, b) => a - b);

  if (!nombre) return { error: "Escribe el nombre." };
  if (!(tipo in TIPOS_TRABAJADOR)) return { error: "Escoge el tipo de trabajador." };
  if (!(formaPago in FORMAS_PAGO)) return { error: "Escoge la forma de pago." };
  if (!Number.isFinite(tarifa) || tarifa < 0) return { error: "La tarifa debe ser un número." };
  if (!Number.isFinite(pasaje) || pasaje < 0) return { error: "El pasaje debe ser un número." };
  if (!PAGO_CUANDO.includes(pagoCuando)) return { error: "Escoge cuándo se le paga." };
  if (pagoCuando === "dia_semana" && !(pagoDia >= 1 && pagoDia <= 7)) return { error: "Escoge qué día de la semana cobra." };
  if ((entrada === null) !== (salida === null)) return { error: "Escoge la hora de entrada y la de salida." };
  if ((entrada && !hhmm.test(entrada)) || (salida && !hhmm.test(salida))) return { error: "La hora no es válida." };
  if (entrada && entrada === salida) return { error: "La hora de salida debe ser distinta a la de entrada." };
  // Con entrada y salida se calculan las horas; sin ellas se conserva el horario viejo escrito a mano.
  const horario: { horario: string | null; horas_dia?: number | null } =
    entrada && salida
      ? { horario: textoHorario({ entrada, salida }), horas_dia: horasEntre(entrada, salida) }
      : horarioAnterior
        ? { horario: horarioAnterior }
        : { horario: null, horas_dia: null };
  if (fechaIngreso && !esFecha(fechaIngreso)) return { error: "La fecha de ingreso no es válida." };

  const fila = {
    nombre,
    tipo,
    actividad: texto(form, "actividad"),
    forma_pago: formaPago,
    tarifa,
    pasaje,
    pago_cuando: pagoCuando,
    pago_dia_semana: pagoCuando === "dia_semana" ? pagoDia : null,
    dias_trabajo: diasTrabajo,
    ...horario,
    telefono: texto(form, "telefono"),
    curp: texto(form, "curp")?.toUpperCase() ?? null,
    fecha_ingreso: fechaIngreso,
    notas: texto(form, "notas"),
    ...(id ? { activo: form.get("activo") === "on" } : {}),
  };

  const { error } = id
    ? await supabase.from("trabajadores").update(fila).eq("id", id)
    : await supabase.from("trabajadores").insert(fila);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/semana");
  revalidatePath("/trabajadores");
  redirect("/trabajadores");
}

/** Guarda la foto de la constancia de condiciones de trabajo ya firmada. */
export async function guardarConstancia(id: string, ruta: string): Promise<{ error: string | null }> {
  const { supabase } = await requerirSesion();
  if (!ruta.startsWith(`constancias/${id}/`)) return { error: "Foto no válida." };
  const { error } = await supabase
    .from("trabajadores")
    .update({ constancia_foto_path: ruta, constancia_firmada_en: hoy() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/trabajadores/${id}`);
  revalidatePath("/trabajadores");
  return { error: null };
}
