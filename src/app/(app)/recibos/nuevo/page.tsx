import Link from "next/link";
import { hoy } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import type { Adelanto, Trabajador } from "@/lib/tipos";
import { FormularioRecibo } from "./FormularioRecibo";

export default async function NuevoRecibo({
  searchParams,
}: {
  searchParams: Promise<{ trabajador?: string }>;
}) {
  const { supabase, perfil } = await requerirSesion();
  const { trabajador } = await searchParams;
  const [{ data: trabajadores }, { data: adelantos }] = await Promise.all([
    supabase.from("trabajadores").select("*").eq("activo", true).order("nombre").returns<Trabajador[]>(),
    supabase.from("adelantos").select("*").is("recibo_id", null).order("fecha").returns<Adelanto[]>(),
  ]);

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Nuevo recibo</h1>
          <div className="sub">Captura lo trabajado; el recibo se arma solo a la derecha.</div>
        </div>
        <Link className="boton chico" href="/">
          Volver a la semana
        </Link>
      </div>
      {(trabajadores ?? []).length === 0 ? (
        <p className="alerta info">
          Primero <Link href="/trabajadores/nuevo">agrega un trabajador</Link>.
        </p>
      ) : (
        <FormularioRecibo
          trabajadores={(trabajadores ?? []).map((t) => ({ ...t, tarifa: Number(t.tarifa), pasaje: Number(t.pasaje) }))}
          adelantos={(adelantos ?? []).map((a) => ({ ...a, monto: Number(a.monto) }))}
          inicial={trabajador}
          hoy={hoy()}
          entrego={perfil.nombre}
        />
      )}
    </>
  );
}
