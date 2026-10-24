"use client";

import { useState, useTransition } from "react";
import { borrarFalta } from "./acciones";

export function QuitarFalta({ id }: { id: string }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className="boton chico"
        disabled={pendiente}
        onClick={() => {
          if (!confirm("¿Quitar esta falta? Úsalo solo si se marcó por error.")) return;
          iniciar(async () => setError((await borrarFalta(id)).error));
        }}
      >
        {pendiente ? "Quitando…" : "Quitar"}
      </button>
      {error && <span className="secundario" style={{ color: "var(--error-texto)" }}>{error}</span>}
    </>
  );
}
