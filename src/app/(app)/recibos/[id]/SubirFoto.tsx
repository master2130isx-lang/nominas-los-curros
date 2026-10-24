"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { marcarFirmado } from "../acciones";

export function SubirFoto({ reciboId }: { reciboId: string }) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function subir() {
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    const extension = (archivo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const ruta = `${reciboId}/${Date.now()}.${extension}`;
    const supabase = crearClienteNavegador();
    const { error: errorSubida } = await supabase.storage
      .from("recibos-firmados")
      .upload(ruta, archivo, { contentType: archivo.type || undefined });
    if (errorSubida) {
      setError(`No se pudo subir la foto: ${errorSubida.message}`);
      setSubiendo(false);
      return;
    }
    const r = await marcarFirmado(reciboId, ruta);
    if (r.error) {
      setError(r.error);
      setSubiendo(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="formulario">
      <p style={{ margin: 0 }}>Toma una foto del recibo ya firmado (o escanéalo) y súbela aquí.</p>
      <div className="campo">
        <label htmlFor="foto">Foto o escaneo</label>
        <input
          id="foto"
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && <p className="alerta">{error}</p>}
      <div>
        <button type="button" className="boton primario" onClick={subir} disabled={!archivo || subiendo}>
          {subiendo ? "Subiendo…" : "Subir y marcar como firmado"}
        </button>
      </div>
    </div>
  );
}
