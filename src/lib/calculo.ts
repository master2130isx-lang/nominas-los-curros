import type { FormaPago, TipoConcepto } from "./tipos";
import { UNIDADES } from "./tipos";
import { cantidad as fmtCantidad } from "./formato";

// Vista previa del recibo en pantalla. Debe dar lo mismo que la función
// crear_recibo de la base de datos, que es la que guarda el recibo.

export interface ExtraCaptura {
  tipo: "extra" | "prestamo" | "otro";
  descripcion: string;
  importe: number;
}

export interface AdelantoCaptura {
  fecha: string;
  monto: number;
  descripcion: string | null;
}

export interface LineaRecibo {
  tipo: TipoConcepto;
  descripcion: string;
  importe: number;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

const tarifaTexto = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function calcularRecibo(params: {
  formaPago: FormaPago;
  tarifa: number;
  pasaje: number;
  cantidad: number;
  extras: ExtraCaptura[];
  adelantos: AdelantoCaptura[];
}): { lineas: LineaRecibo[]; total: number } {
  const { formaPago, tarifa, pasaje, cantidad, extras, adelantos } = params;
  const lineas: LineaRecibo[] = [];

  lineas.push({
    tipo: "trabajo",
    descripcion: `${fmtCantidad(cantidad)} ${UNIDADES[formaPago]} × ${tarifaTexto(tarifa)}`,
    importe: redondear(cantidad * tarifa),
  });

  if (pasaje > 0) {
    const porDia = formaPago === "dia" || formaPago === "turno";
    lineas.push({
      tipo: "pasaje",
      descripcion: "Apoyo de pasaje",
      importe: porDia ? redondear(cantidad * pasaje) : pasaje,
    });
  }

  for (const e of extras) {
    const importe = Math.abs(e.importe || 0);
    if (!importe) continue;
    lineas.push({
      tipo: e.tipo,
      descripcion: e.descripcion.trim(),
      importe: e.tipo === "prestamo" ? -importe : importe,
    });
  }

  const ordenados = [...adelantos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  for (const a of ordenados) {
    const nota = a.descripcion?.trim();
    lineas.push({
      tipo: "adelanto",
      descripcion: `Descuento de adelanto del ${fechaCorta(a.fecha)}${nota ? ` (${nota})` : ""}`,
      importe: -a.monto,
    });
  }

  const total = redondear(lineas.reduce((s, l) => s + l.importe, 0));
  return { lineas, total };
}
