"use client";

import { lazy, Suspense, useRef, useState } from "react";
import type { Apartado } from "@/lib/guias";

const NOMBRES: Record<Apartado, string> = {
  hoy: "Pagos del día",
  asistencia: "Asistencia de la semana",
  semana: "Semana",
  nuevo: "Nuevo recibo",
  recibos: "Recibos",
  faltas: "Faltas",
  trabajadores: "Trabajadores",
  prestamos: "Préstamos",
};

const cargar = () => import("./GuiaContenido");
const GuiaContenido = lazy(cargar);

/** Botón “Guía” de cada apartado: abre pasos numerados para aprender a usarlo. */
export function BotonGuia({ apartado }: { apartado: Apartado }) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={boton}
        type="button"
        className="boton chico guia"
        aria-haspopup="dialog"
        onClick={() => setAbierto(true)}
        onPointerEnter={cargar}
        onFocus={cargar}
      >
        <span className="signo" aria-hidden="true">
          ?
        </span>
        Guía
      </button>
      {abierto && (
        <Suspense fallback={null}>
          <GuiaContenido apartado={apartado} titulo={NOMBRES[apartado]} retorno={boton} alCerrar={() => setAbierto(false)} />
        </Suspense>
      )}
    </>
  );
}
