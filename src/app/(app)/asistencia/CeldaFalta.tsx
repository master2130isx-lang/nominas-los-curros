"use client";

import { useState } from "react";
import { IconoMas } from "@/componentes/Iconos";
import { TEXTO_FALTA } from "@/componentes/PastillaFalta";
import { fechaConDia } from "@/lib/formato";
import { DIAS_SEMANA, diaIso } from "@/lib/programa";
import { MarcarFalta, type FaltaEditable } from "../faltas/MarcarFalta";

const CORTO = { sin_aviso: "S/A", sin_goce: "S/G", justificada: "Just." } as const;

/** Celda de la cuadrícula: abre el panel para marcar, corregir o quitar la falta de ese día. */
export function CeldaFalta({
  trabajadorId,
  nombre,
  fecha,
  semanaFija,
  falta,
  libre,
}: {
  trabajadorId: string;
  nombre: string;
  fecha: string;
  semanaFija: boolean;
  falta?: FaltaEditable;
  /** Día que no tiene marcado como de trabajo (igual se puede anotar). */
  libre: boolean;
}) {
  const [latido, setLatido] = useState(0);
  // Dos clases que se alternan para que la animación se repita en cada guardado.
  const animacion = latido === 0 ? "" : latido % 2 ? "guardada" : "guardada otra";
  const clase = ["celda", falta ? `falta ${falta.tipo}` : libre ? "libre" : "", animacion].filter(Boolean).join(" ");
  const media = falta && falta.fraccion < 1;
  const etiqueta = `${nombre}, ${fechaConDia(fecha)}: ${
    falta ? `${media ? "media " : ""}falta ${TEXTO_FALTA[falta.tipo]}. Corregir o quitar` : `${libre ? "descanso" : "día de trabajo"}. Marcar falta`
  }`;
  return (
    <MarcarFalta
      trabajadorId={trabajadorId}
      nombre={nombre}
      fecha={fecha}
      semanaFija={semanaFija}
      falta={falta}
      className={clase}
      etiqueta={etiqueta}
      alGuardar={() => setLatido((n) => n + 1)}
    >
      <span className="dia-movil" aria-hidden="true">
        <span>{DIAS_SEMANA[diaIso(fecha) - 1].slice(0, 2)}</span> {Number(fecha.slice(8))}
      </span>
      {falta ? (
        <span className="estado">
          {media ? "½ " : ""}
          <span className="largo">{falta.tipo === "justificada" ? "Justif." : TEXTO_FALTA[falta.tipo].replace("sin ", "Sin ")}</span>
          <span className="corto">{CORTO[falta.tipo]}</span>
        </span>
      ) : (
        <>
          {libre && <span className="estado largo">Descanso</span>}
          <IconoMas className="icono-celda" />
        </>
      )}
    </MarcarFalta>
  );
}
