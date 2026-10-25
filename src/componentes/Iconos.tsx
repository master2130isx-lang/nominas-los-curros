// Iconos de línea (24×24, trazo 2) dibujados para la plataforma. Decorativos:
// siempre van junto a un texto, así que se ocultan a los lectores de pantalla.

type P = { className?: string };
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export const IconoHoy = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 9.5v.01M18 14.5v.01" />
  </svg>
);
export const IconoAsistencia = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4M8 14l2 2 4-4" />
  </svg>
);
export const IconoSemana = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 20V10M9 20V4M14 20v-7M19 20V8" />
  </svg>
);
export const IconoNuevo = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M12 11v6M9 14h6" />
  </svg>
);
export const IconoRecibos = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);
export const IconoFaltas = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21a7 7 0 0 1 14 0M17 8l4 4M21 8l-4 4" />
  </svg>
);
export const IconoTrabajadores = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3" />
  </svg>
);
export const IconoPrestamos = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2" />
  </svg>
);
export const IconoIzquierda = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const IconoDerecha = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);
export const IconoPalomita = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M5 12l5 5 9-10" />
  </svg>
);
export const IconoMas = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconoCalendario = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4" />
  </svg>
);
export const IconoLupa = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
