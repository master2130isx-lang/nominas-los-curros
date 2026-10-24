import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/sesion";
import type { Trabajador } from "@/lib/tipos";
import { FormularioTrabajador } from "../FormularioTrabajador";

export default async function EditarTrabajador({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requerirSesion();
  const { id } = await params;
  const { data: t } = await supabase.from("trabajadores").select("*").eq("id", id).maybeSingle<Trabajador>();
  if (!t) notFound();
  return (
    <>
      <div className="encabezado">
        <div>
          <h1>{t.nombre}</h1>
          <div className="sub">
            Cambiar la tarifa solo afecta los recibos nuevos; los ya hechos se quedan como están.
          </div>
        </div>
        <div className="acciones">
          <Link className="boton chico" href={`/recibos?trabajador=${t.id}`}>
            Ver sus recibos
          </Link>
          <Link className="boton chico" href="/trabajadores">
            Volver
          </Link>
        </div>
      </div>
      <FormularioTrabajador trabajador={{ ...t, tarifa: Number(t.tarifa), pasaje: Number(t.pasaje) }} />
    </>
  );
}
