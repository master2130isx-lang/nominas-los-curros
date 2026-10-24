"use client";

import { useActionState } from "react";
import { cancelarRecibo, type EstadoFormulario } from "../acciones";

export function CancelarRecibo({ reciboId }: { reciboId: string }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(cancelarRecibo, { error: null });
  return (
    <form
      action={accion}
      className="formulario"
      onSubmit={(e) => {
        if (!confirm("¿Seguro que quieres cancelar este recibo? No se puede deshacer.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={reciboId} />
      <div className="campo">
        <label htmlFor="motivo">Motivo</label>
        <input id="motivo" name="motivo" type="text" placeholder="Por ejemplo: se capturaron mal los días" required />
      </div>
      {estado.error && <p className="alerta">{estado.error}</p>}
      <div>
        <button type="submit" className="boton peligro" disabled={enviando}>
          Cancelar recibo
        </button>
      </div>
    </form>
  );
}
