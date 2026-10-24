"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { registrarImpresion } from "../(app)/recibos/acciones";

export function BotonImprimir({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  return (
    <button
      type="button"
      className="boton primario"
      disabled={!ids.length || ocupado}
      onClick={async () => {
        setOcupado(true);
        window.print();
        // Se cuenta después de abrir el diálogo, para que esta hoja salga como
        // original y las siguientes como reimpresión.
        await registrarImpresion(ids);
        setOcupado(false);
        router.refresh();
      }}
    >
      Imprimir
    </button>
  );
}
