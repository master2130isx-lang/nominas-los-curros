"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { traducirErrorSubida } from "@/lib/errores";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { guardarDocumento } from "../acciones";

const SUGERIDOS = ["INE", "Comprobante de domicilio", "Acta de nacimiento", "Contrato firmado", "Constancia de situación fiscal", "Alta IMSS"];

/** Adjunta un documento al expediente (foto o PDF) en el espacio privado de la plataforma. */
export function SubirDocumento({ trabajadorId }: { trabajadorId: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [entrada, setEntrada] = useState(0);

  async function subir() {
    if (!archivo || !nombre.trim()) return;
    setSubiendo(true);
    setError(null);
    const extension = (archivo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const ruta = `documentos/${trabajadorId}/${Date.now()}.${extension}`;
    const { error: errorSubida } = await crearClienteNavegador()
      .storage.from("recibos-firmados")
      .upload(ruta, archivo, { contentType: archivo.type || undefined });
    if (errorSubida) {
      setError(traducirErrorSubida(errorSubida.message));
      setSubiendo(false);
      return;
    }
    const r = await guardarDocumento(trabajadorId, nombre, ruta);
    setSubiendo(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    setNombre("");
    setArchivo(null);
    setEntrada((n) => n + 1);
    router.refresh();
  }

  return (
    <div className="formulario" style={{ gap: 12 }}>
      <div className="rejilla-dos uniforme">
        <div className="campo">
          <label htmlFor="doc-nombre">Qué documento es</label>
          <input id="doc-nombre" type="text" list="doc-sugeridos" maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <datalist id="doc-sugeridos">
            {SUGERIDOS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="campo">
          <label htmlFor="doc-archivo">Foto o PDF</label>
          <input key={entrada} id="doc-archivo" type="file" accept="image/*,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      {error && (
        <p className="alerta aparece" role="alert">
          {error}
        </p>
      )}
      <div>
        <button type="button" className="boton chico" onClick={subir} disabled={!archivo || !nombre.trim() || subiendo} aria-busy={subiendo}>
          {subiendo ? "Subiendo…" : "Adjuntar documento"}
        </button>
      </div>
    </div>
  );
}
