import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatosHoja } from "@/componentes/ReciboHoja";
import type { Concepto, Recibo } from "./tipos";

export interface ReciboCompleto {
  recibo: Recibo;
  hoja: DatosHoja;
}

/** Recibos con sus conceptos y el nombre de quien los entregó, listos para la hoja. */
export async function cargarRecibos(supabase: SupabaseClient, recibos: Recibo[]): Promise<ReciboCompleto[]> {
  if (recibos.length === 0) return [];
  const ids = recibos.map((r) => r.id);
  const creadores = [...new Set(recibos.map((r) => r.creado_por))];
  const [{ data: conceptos }, { data: perfiles }] = await Promise.all([
    supabase.from("recibo_conceptos").select("*").in("recibo_id", ids).order("orden").returns<Concepto[]>(),
    supabase.from("perfiles").select("id, nombre").in("id", creadores).returns<{ id: string; nombre: string }[]>(),
  ]);
  const nombres = new Map((perfiles ?? []).map((p) => [p.id, p.nombre]));
  return recibos.map((r) => ({
    recibo: r,
    hoja: {
      folio: r.folio,
      trabajador: r.trabajador_nombre,
      actividad: r.trabajador_actividad,
      periodoInicio: r.periodo_inicio,
      periodoFin: r.periodo_fin,
      fechaPago: r.fecha_pago,
      lineas: (conceptos ?? [])
        .filter((c) => c.recibo_id === r.id)
        .map((c) => ({ descripcion: c.descripcion, importe: Number(c.importe) })),
      total: Number(r.total),
      nota: r.nota,
      entrego: nombres.get(r.creado_por) ?? "",
    },
  }));
}
