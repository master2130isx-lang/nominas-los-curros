"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/", texto: "Pagos del día" },
  { href: "/semana", texto: "Semana" },
  { href: "/recibos/nuevo", texto: "Nuevo recibo" },
  { href: "/recibos", texto: "Recibos" },
  { href: "/faltas", texto: "Faltas" },
  { href: "/trabajadores", texto: "Trabajadores" },
  { href: "/adelantos", texto: "Préstamos" },
];

export function MenuNav() {
  const ruta = usePathname();
  const activo = (href: string) =>
    href === "/" ? ruta === "/" : href === "/recibos" ? ruta === "/recibos" || /^\/recibos\/(?!nuevo)/.test(ruta) : ruta.startsWith(href);
  return (
    <nav aria-label="Menú principal">
      {ENLACES.map((e) => (
        <Link key={e.href} href={e.href} aria-current={activo(e.href) ? "page" : undefined}>
          {e.texto}
        </Link>
      ))}
    </nav>
  );
}
