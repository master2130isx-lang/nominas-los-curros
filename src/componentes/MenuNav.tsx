"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
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
  const activo = (href: string) =>
    href === "/" ? ruta === "/" : href === "/recibos" ? ruta === "/recibos" || /^\/recibos\/(?!nuevo)/.test(ruta) : ruta.startsWith(href);

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
        <Link key={href} href={href} aria-current={activo(href) ? "page" : undefined}>
          <Icono />
          {texto}
        </Link>
      ))}
    </nav>
  );
}
