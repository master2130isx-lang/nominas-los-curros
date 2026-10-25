"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { traducirErrorSubida } from "@/lib/errores";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { marcarHojaSemanal } from "../../(app)/recibos/acciones";

/** Sube la foto de la hoja semanal firmada y marca firmados los recibos diarios de esa semana. */
export function SubirHojaSemanal({ lunes }: { lunes: string }) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [mensaje, setMensaje] = useState<{ error: boolean; texto: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function subir() {
    if (!archivo) return;
    setSubiendo(true);
    setMensaje(null);
    const extension = (archivo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const ruta = `semanas/${lunes}/${Date.now()}.${extension}`;
    const { error } = await crearClienteNavegador()
      .storage.from("recibos-firmados")
      .upload(ruta, archivo, { contentType: archivo.type || undefined });
    if (error) {
      setMensaje({ error: true, texto: traducirErrorSubida(error.message) });
      setSubiendo(false);
      return;
    }
    const r = await marcarHojaSemanal(lunes, ruta);
    setSubiendo(false);
    setMensaje(r.error ? { error: true, texto: r.error } : { error: false, texto: `Listo: ${r.marcados} recibos quedaron firmados.` });
    if (!r.error) router.refresh();
  }

  return (
    <div className="formulario" style={{ gap: 12 }}>
      <div className="campo">
        <label htmlFor="foto-semana">Foto o escaneo de la hoja firmada</label>
        <input id="foto-semana" type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      </div>
      {mensaje && (
        <p className={`alerta aparece${mensaje.error ? "" : " ok"}`} role={mensaje.error ? "alert" : "status"}>
          {mensaje.texto}
        </p>
      )}
      <div>
        <button type="button" className="boton primario" onClick={subir} disabled={!archivo || subiendo} aria-busy={subiendo}>
          {subiendo ? "Subiendo…" : "Subir y marcar como firmados"}
        </button>
      </div>
    </div>
  );
}
