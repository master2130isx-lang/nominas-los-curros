"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  IconoAsistencia,
  IconoFaltas,
  IconoHoy,
  IconoNuevo,
  IconoPrestamos,
  IconoRecibos,
  IconoSemana,
  IconoTrabajadores,
} from "./Iconos";

const ENLACES = [
  { href: "/", texto: "Pagos del día", Icono: IconoHoy },
  { href: "/asistencia", texto: "Asistencia", Icono: IconoAsistencia },
  { href: "/semana", texto: "Semana", Icono: IconoSemana },
  { href: "/recibos/nuevo", texto: "Nuevo recibo", Icono: IconoNuevo },
  { href: "/recibos", texto: "Recibos", Icono: IconoRecibos },
  { href: "/faltas", texto: "Faltas", Icono: IconoFaltas },
  { href: "/trabajadores", texto: "Trabajadores", Icono: IconoTrabajadores },
  { href: "/adelantos", texto: "Préstamos", Icono: IconoPrestamos },
];

export function MenuNav() {
  const ruta = usePathname();
  const nav = useRef<HTMLElement>(null);
  // Al tocar un apartado se resalta al instante, sin esperar a que el servidor responda.
  const [pendiente, setPendiente] = useState<string | null>(null);
  useEffect(() => setPendiente(null), [ruta]);
  // Mientras llega la sección, el contenido actual se atenúa y aparece una barra de progreso.
  useEffect(() => {
    if (pendiente) document.documentElement.setAttribute("data-navegando", "");
    else document.documentElement.removeAttribute("data-navegando");
  }, [pendiente]);
  const actual = pendiente ?? ruta;
  const activo = (href: string) =>
    href === "/" ? actual === "/" : href === "/recibos" ? actual === "/recibos" || /^\/recibos\/(?!nuevo)/.test(actual) : actual.startsWith(href);

  // En el celular las pestañas se deslizan: la de la pantalla actual queda a la vista.
  useEffect(() => {
    const actual = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (actual && nav.current && nav.current.scrollWidth > nav.current.clientWidth) {
      nav.current.scrollTo({ left: actual.offsetLeft - 16, behavior: "instant" as ScrollBehavior });
    }
  }, [ruta]);

  return (
    <nav aria-label="Menú principal" ref={nav}>
      {ENLACES.map(({ href, texto, Icono }) => (
        <Link
          key={href}
          href={href}
          aria-current={activo(href) ? "page" : undefined}
          data-cargando={pendiente === href ? "" : undefined}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || href === ruta) return;
            setPendiente(href);
          }}
        >
          <Icono />
          {texto}
        </Link>
      ))}
    </nav>
  );
}
