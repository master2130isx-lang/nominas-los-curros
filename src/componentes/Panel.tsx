"use client";

import { useEffect, useId, useRef } from "react";

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  descripcion?: React.ReactNode;
  /** Elemento que recibe el foco al cerrar (el botón que abrió el panel). */
  retorno?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

/**
 * Panel modal (hoja inferior en el celular) sobre <dialog>. Se cierra con
 * Escape, con el fondo o con los botones del contenido; mientras está abierto el
 * foco no sale del panel, y al cerrar regresa al botón que lo abrió. Solo existe
 * en la página mientras está abierto.
 */
export function Panel(props: Props) {
  return props.abierto ? <PanelAbierto {...props} /> : null;
}

function PanelAbierto({ alCerrar, titulo, descripcion, retorno, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idDescripcion = useId();
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;

  useEffect(() => {
    const dialogo = ref.current;
    if (dialogo && !dialogo.open) dialogo.showModal();
    const primero = dialogo?.querySelector<HTMLElement>("[data-foco-inicial]") ?? dialogo?.querySelector<HTMLElement>(ENFOCABLES);
    primero?.focus();
    const destino = retorno?.current;
    return () => {
      destino?.focus();
    };
  }, [retorno]);

  return (
    <dialog
      ref={ref}
      className="panel"
      aria-labelledby={idTitulo}
      aria-describedby={descripcion ? idDescripcion : undefined}
      onCancel={(e) => {
        // Escape: se cierra desde React para devolver el foco al botón.
        e.preventDefault();
        cerrar.current();
      }}
      onClick={(e) => {
        if (e.target === ref.current) cerrar.current();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab" || !ref.current) return;
        const lista = [...ref.current.querySelectorAll<HTMLElement>(ENFOCABLES)].filter((el) => el.offsetParent !== null);
        if (!lista.length) return;
        const primero = lista[0];
        const ultimo = lista[lista.length - 1];
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }}
    >
      <div className="panel-cabeza">
        <h2 id={idTitulo}>{titulo}</h2>
        {descripcion && <p id={idDescripcion}>{descripcion}</p>}
      </div>
      {children}
    </dialog>
  );
}
