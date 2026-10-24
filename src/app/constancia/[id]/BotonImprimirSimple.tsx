"use client";

export function BotonImprimirSimple() {
  return (
    <button type="button" className="boton primario" onClick={() => window.print()}>
      Imprimir
    </button>
  );
}
