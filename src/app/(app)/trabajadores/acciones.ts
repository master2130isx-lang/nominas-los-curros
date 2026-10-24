"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { esFecha } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { FORMAS_PAGO, TIPOS_TRABAJADOR } from "@/lib/tipos";
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

  if (!nombre) return { error: "Escribe el nombre." };
  if (!(tipo in TIPOS_TRABAJADOR)) return { error: "Escoge el tipo de trabajador." };
  if (!(formaPago in FORMAS_PAGO)) return { error: "Escoge la forma de pago." };
  if (!Number.isFinite(tarifa) || tarifa < 0) return { error: "La tarifa debe ser un número." };
  if (!Number.isFinite(pasaje) || pasaje < 0) return { error: "El pasaje debe ser un número." };
  if (fechaIngreso && !esFecha(fechaIngreso)) return { error: "La fecha de ingreso no es válida." };

  const fila = {
    nombre,
    tipo,
    actividad: texto(form, "actividad"),
    forma_pago: formaPago,
    tarifa,
    pasaje,
    dia_pago: texto(form, "dia_pago"),
    horario: texto(form, "horario"),
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
  revalidatePath("/trabajadores");
  redirect("/trabajadores");
}
