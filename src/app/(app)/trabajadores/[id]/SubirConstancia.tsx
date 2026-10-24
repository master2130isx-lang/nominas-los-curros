"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { guardarConstancia } from "../acciones";

export function SubirConstancia({ trabajadorId }: { trabajadorId: string }) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function subir() {
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    const extension = (archivo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const ruta = `constancias/${trabajadorId}/${Date.now()}.${extension}`;
    const supabase = crearClienteNavegador();
    const { error: errorSubida } = await supabase.storage
      .from("recibos-firmados")
      .upload(ruta, archivo, { contentType: archivo.type || undefined });
    if (errorSubida) {
      setError(`No se pudo subir la foto: ${errorSubida.message}`);
      setSubiendo(false);
      return;
    }
    const r = await guardarConstancia(trabajadorId, ruta);
    setSubiendo(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    setArchivo(null);
    router.refresh();
  }

  return (
    <div className="formulario" style={{ gap: 10 }}>
      <div className="campo">
        <label htmlFor="foto-constancia">Foto o escaneo de la constancia firmada</label>
        <input
          id="foto-constancia"
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && <p className="alerta">{error}</p>}
      <div>
        <button type="button" className="boton chico" onClick={subir} disabled={!archivo || subiendo}>
          {subiendo ? "Subiendo…" : "Subir constancia firmada"}
        </button>
      </div>
    </div>
  );
}
