"use client";

import { useFormStatus } from "react-dom";

/** Botón de envío que muestra que está trabajando mientras responde el servidor. */
export function BotonEnviar({ children, ocupado, className = "boton primario" }: { children: React.ReactNode; ocupado: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? ocupado : children}
    </button>
  );
}
