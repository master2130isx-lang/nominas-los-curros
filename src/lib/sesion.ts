import { redirect } from "next/navigation";
import { crearClienteServidor } from "./supabase/server";
import type { Perfil } from "./tipos";

/** Usuario con sesión y perfil activo; si no, lo saca de la plataforma. */
export async function requerirSesion() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, activo")
    .eq("id", user.id)
    .maybeSingle<Perfil>();
  if (!perfil || !perfil.activo) redirect("/sin-acceso");

  return { supabase, user, perfil };
}
