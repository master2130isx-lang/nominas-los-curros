const pesos = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

export function dinero(n: number): string {
  // Intl pone el signo menos pegado; lo dejamos como −$200.00
  const s = pesos.format(Math.abs(n));
  return n < 0 ? `−${s}` : s;
}

export function cantidad(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function partes(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return { a, m, d, dow: new Date(Date.UTC(a, m - 1, d)).getUTCDay() };
}

/** "24 de octubre de 2026" */
export function fechaLarga(iso: string): string {
  const { a, m, d } = partes(iso);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** "sábado 24 de octubre" */
export function fechaConDia(iso: string): string {
  const { m, d, dow } = partes(iso);
  return `${DIAS[dow]} ${d} de ${MESES[m - 1]}`;
}

/** "19 al 24 de octubre de 2026", "28 de septiembre al 4 de octubre de 2026" */
export function rango(inicio: string, fin: string): string {
  const a = partes(inicio);
  const b = partes(fin);
  if (inicio === fin) return fechaLarga(inicio);
  if (a.a === b.a && a.m === b.m) return `${a.d} al ${b.d} de ${MESES[b.m - 1]} de ${b.a}`;
  if (a.a === b.a) return `${a.d} de ${MESES[a.m - 1]} al ${b.d} de ${MESES[b.m - 1]} de ${b.a}`;
  return `${fechaLarga(inicio)} al ${fechaLarga(fin)}`;
}

export function folio(n: number): string {
  return String(n).padStart(4, "0");
}
