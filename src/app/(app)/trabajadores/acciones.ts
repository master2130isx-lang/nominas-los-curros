"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { traducirError } from "@/lib/errores";
import { esFecha, hoy } from "@/lib/fechas";
import { horasEntre, textoHorario } from "@/lib/horario";
import { requerirSesion } from "@/lib/sesion";
import { FORMAS_PAGO, TIPOS_CONTRATO, TIPOS_TRABAJADOR, type PagoCuando } from "@/lib/tipos";
import { esUuid } from "@/lib/validacion";
import type { EstadoFormulario } from "../recibos/acciones";

const PAGO_CUANDO: PagoCuando[] = ["dia_semana", "cada_dia", "al_terminar"];

// Formatos oficiales (SAT, RENAPO, IMSS). Se validan solo si se escriben.
const CURP = /^[A-Z][AEIOUX][A-Z]{2}[0-9]{6}[HMX][A-Z]{5}[A-Z0-9][0-9]$/;
const RFC = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
const NSS = /^[0-9]{11}$/;

const texto = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

export async function guardarTrabajador(_previo: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { supabase, perfil } = await requerirSesion();
  const id = texto(form, "id");
  if (id && !esUuid(id)) return { error: "El trabajador no es válido." };
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
  const fechaNacimiento = texto(form, "fecha_nacimiento");
  if (fechaNacimiento && (!esFecha(fechaNacimiento) || fechaNacimiento >= hoy())) return { error: "La fecha de nacimiento no es válida." };
  const curp = texto(form, "curp")?.toUpperCase().replace(/\s/g, "") ?? null;
  if (curp && !CURP.test(curp)) return { error: "La CURP debe tener 18 caracteres con el formato oficial." };
  const rfc = texto(form, "rfc")?.toUpperCase().replace(/[\s-]/g, "") ?? null;
  if (rfc && !RFC.test(rfc)) return { error: "El RFC no tiene el formato correcto (13 caracteres para persona física)." };
  const nss = texto(form, "nss")?.replace(/[\s-]/g, "") ?? null;
  if (nss && !NSS.test(nss)) return { error: "El número de seguro social (NSS) debe tener 11 dígitos." };
  const tipoContrato = texto(form, "tipo_contrato");
  if (tipoContrato && !(tipoContrato in TIPOS_CONTRATO)) return { error: "Escoge el tipo de contrato." };
  const salarioTexto = texto(form, "salario_diario");
  const salarioDiario = salarioTexto === null ? null : Number(salarioTexto);
  if (salarioDiario !== null && (!Number.isFinite(salarioDiario) || salarioDiario < 0)) return { error: "El salario diario debe ser un número." };

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
    curp,
    rfc,
    nss,
    fecha_nacimiento: fechaNacimiento,
    domicilio: texto(form, "domicilio"),
    contacto_emergencia: texto(form, "contacto_emergencia"),
    telefono_emergencia: texto(form, "telefono_emergencia"),
    tipo_contrato: tipoContrato,
    salario_diario: salarioDiario,
    alimentacion: form.get("alimentacion") === "on",
    fecha_ingreso: fechaIngreso,
    notas: texto(form, "notas"),
    ...(id ? { activo: form.get("activo") === "on" } : {}),
  };

  // La tarifa y la baja solo las cambia el administrador (la base de datos también lo revisa).
  if (id && perfil.rol !== "admin") {
    const { data: actual, error: errorActual } = await supabase
      .from("trabajadores")
      .select("tarifa, activo, salario_diario")
      .eq("id", id)
      .maybeSingle<{ tarifa: number; activo: boolean; salario_diario: number | null }>();
    if (errorActual || !actual) return { error: traducirError(errorActual, "No se encontró al trabajador.") };
    if (Number(actual.tarifa) !== tarifa) return { error: "Solo el administrador puede cambiar la tarifa." };
    if (actual.activo !== fila.activo) return { error: "Solo el administrador puede dar de baja o reactivar a un trabajador." };
    if ((actual.salario_diario === null ? null : Number(actual.salario_diario)) !== salarioDiario) {
      return { error: "Solo el administrador puede cambiar el salario diario." };
    }
  }

  const { error } = id
    ? await supabase.from("trabajadores").update(fila).eq("id", id)
    : await supabase.from("trabajadores").insert(fila);
  if (error) return { error: traducirError(error, "No se pudo guardar el trabajador.") };

  revalidatePath("/");
  revalidatePath("/semana");
  revalidatePath("/trabajadores");
  redirect("/trabajadores");
}

/** Guarda la foto de la constancia de condiciones de trabajo ya firmada. */
export async function guardarConstancia(id: string, ruta: string): Promise<{ error: string | null }> {
  const { supabase } = await requerirSesion();
  if (!esUuid(id) || !ruta.startsWith(`constancias/${id}/`)) return { error: "Foto no válida." };
  const { error } = await supabase
    .from("trabajadores")
    .update({ constancia_foto_path: ruta, constancia_firmada_en: hoy() })
    .eq("id", id);
  if (error) return { error: traducirError(error, "No se pudo guardar la constancia.") };
  revalidatePath(`/trabajadores/${id}`);
  revalidatePath("/trabajadores");
  return { error: null };
}

/** Registra un documento ya subido al almacenamiento (INE, contrato, comprobante…). */
export async function guardarDocumento(id: string, nombre: string, ruta: string): Promise<{ error: string | null }> {
  const { supabase } = await requerirSesion();
  const limpio = nombre.trim().slice(0, 80);
  if (!esUuid(id) || !ruta.startsWith(`documentos/${id}/`)) return { error: "Documento no válido." };
  if (!limpio) return { error: "Escribe qué documento es." };
  const { error } = await supabase.from("trabajador_documentos").insert({ trabajador_id: id, nombre: limpio, ruta });
  if (error) return { error: traducirError(error, "No se pudo guardar el documento.") };
  revalidatePath(`/trabajadores/${id}`);
  return { error: null };
}
