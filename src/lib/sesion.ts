import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { crearClienteServidor } from "./supabase/server";
import { CABECERA_USUARIO } from "./supabase/cabecera";
import type { Perfil } from "./tipos";
import { esUuid } from "./validacion";

/**
 * Usuario con sesión y perfil activo; si no, lo saca de la plataforma.
 *
 * El middleware ya validó la sesión con Supabase (getUser) y pasa el id del
 * usuario en una cabecera interna que borra si viene del navegador; así no se
 * vuelve a llamar a getUser() en cada página. `cache` hace que el layout y la
 * página compartan la misma consulta del perfil en una petición.
 */
export const requerirSesion = cache(async () => {
  const supabase = await crearClienteServidor();
  const desdeMiddleware = (await headers()).get(CABECERA_USUARIO);
  let usuarioId = esUuid(desdeMiddleware) ? desdeMiddleware : null;
  if (!usuarioId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    usuarioId = user?.id ?? null;
  }
  if (!usuarioId) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, activo")
    .eq("id", usuarioId)
    .maybeSingle<Perfil>();
  if (!perfil || !perfil.activo) redirect("/sin-acceso");

  return { supabase, usuarioId, perfil };
});
