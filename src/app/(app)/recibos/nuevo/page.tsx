import Link from "next/link";
import { esFecha, hoy } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import type { Adelanto, Falta, Trabajador } from "@/lib/tipos";
import { FormularioRecibo } from "./FormularioRecibo";

export default async function NuevoRecibo({
  searchParams,
}: {
  searchParams: Promise<{ trabajador?: string; fecha?: string }>;
}) {
  const { supabase, perfil } = await requerirSesion();
  const { trabajador, fecha } = await searchParams;
  const dia = fecha && esFecha(fecha) ? fecha : hoy();
  const [{ data: trabajadores }, { data: adelantos }, { data: faltas }] = await Promise.all([
    supabase.from("trabajadores").select("*").eq("activo", true).order("nombre").returns<Trabajador[]>(),
    supabase.from("adelantos").select("*").is("recibo_id", null).order("fecha").returns<Adelanto[]>(),
    supabase.from("faltas").select("*").is("recibo_id", null).order("fecha").returns<Falta[]>(),
  ]);

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Nuevo recibo</h1>
          <div className="sub">Captura lo trabajado y el recibo se arma solo mientras escribes.</div>
        </div>
        <Link className="boton chico" href={dia === hoy() ? "/" : `/?fecha=${dia}`}>
          Volver a los pagos del día
        </Link>
      </div>
      {(trabajadores ?? []).length === 0 ? (
        <p className="alerta info">
          Primero <Link href="/trabajadores/nuevo">agrega un trabajador</Link>.
        </p>
      ) : (
        <FormularioRecibo
          trabajadores={(trabajadores ?? []).map((t) => ({
            ...t,
            tarifa: Number(t.tarifa),
            pasaje: Number(t.pasaje),
            horas_dia: t.horas_dia === null ? null : Number(t.horas_dia),
          }))}
          faltas={(faltas ?? []).map((f) => ({ ...f, fraccion: Number(f.fraccion) }))}
          adelantos={(adelantos ?? []).map((a) => ({ ...a, monto: Number(a.monto) }))}
          inicial={trabajador}
          fecha={dia}
          entrego={perfil.nombre}
        />
      )}
    </>
  );
}
