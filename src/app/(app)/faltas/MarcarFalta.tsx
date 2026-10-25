"use client";

import { lazy, Suspense, useRef, useState } from "react";
import { Panel } from "@/componentes/Panel";
import { fechaConDia } from "@/lib/formato";
import type { TipoFalta } from "@/lib/tipos";

// El formulario se descarga al acercarse al botón (o al abrir), no con la página.
const cargarFormulario = () => import("./FormularioPanel");
const FormularioPanel = lazy(cargarFormulario);

export interface FaltaEditable {
  id: string;
  tipo: TipoFalta;
  fraccion: number;
  nota: string | null;
}

interface Props {
  trabajadorId: string;
  nombre: string;
  fecha: string;
  /** Solo a los de semana fija se les muestra cuánto se descuenta. */
  semanaFija: boolean;
  /** Si ya hay falta (sin recibo), el panel la edita o la quita. */
  falta?: FaltaEditable;
  /** Contenido del botón que abre el panel; por defecto "Marcar falta" o "Corregir". */
  children?: React.ReactNode;
  className?: string;
  /** Nombre accesible; por defecto dice qué hace, a quién y qué día. */
  etiqueta?: string;
  /** Avisa al terminar (para animar la celda que cambió). */
  alGuardar?: () => void;
}

/** Botón que abre el panel para marcar, corregir o quitar la falta de un trabajador en un día. */
export function MarcarFalta({ trabajadorId, nombre, fecha, semanaFija, falta, children, className, etiqueta, alGuardar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={boton}
        type="button"
        className={className ?? "boton chico"}
        aria-haspopup="dialog"
        aria-label={
          etiqueta ??
          (falta
            ? `Corregir o quitar la falta de ${nombre} del ${fechaConDia(fecha)}`
            : `Marcar falta de ${nombre} el ${fechaConDia(fecha)}`)
        }
        onClick={() => setAbierto(true)}
        onPointerEnter={cargarFormulario}
        onFocus={cargarFormulario}
      >
        {children ?? (falta ? "Corregir" : "Marcar falta")}
      </button>
      <Panel
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        retorno={boton}
        titulo={falta ? `Corregir la falta de ${nombre}` : `¿Qué tipo de falta de ${nombre}?`}
        descripcion={fechaConDia(fecha)}
      >
        <Suspense
          fallback={
            <div className="panel-cuerpo" aria-busy="true">
              <p className="ayuda">Cargando…</p>
            </div>
          }
        >
          <FormularioPanel
          trabajadorId={trabajadorId}
          nombre={nombre}
          fecha={fecha}
          semanaFija={semanaFija}
          falta={falta}
          alTerminar={() => {
            setAbierto(false);
            alGuardar?.();
          }}
          alCancelar={() => setAbierto(false)}
          />
        </Suspense>
      </Panel>
    </>
  );
}
