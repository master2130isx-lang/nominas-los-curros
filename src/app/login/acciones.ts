"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function entrar(form: FormData) {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("correo") ?? "").trim(),
    password: String(form.get("contrasena") ?? ""),
  });
  if (error) redirect("/login?error=1");
  redirect("/");
}

export async function salir() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
