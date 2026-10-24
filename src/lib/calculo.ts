import type { FormaPago, TipoConcepto, TipoFalta } from "./tipos";
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

export interface FaltaCaptura {
  fecha: string;
  tipo: TipoFalta;
  fraccion: number;
  nota: string | null;
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

const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** "miércoles 21/10/2026" (como fecha_con_dia en la base de datos) */
function fechaConDia(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS[(dow + 6) % 7]} ${fechaCorta(iso)}`;
}

/** "todos los días" o "lun, mar, jue" (como texto_dias en la base de datos) */
export function textoDiasCorto(dias: number[]): string {
  if (dias.length === 7) return "todos los días";
  return [...dias].sort((a, b) => a - b).map((d) => DIAS[d - 1].slice(0, 3)).join(", ");
}

/**
 * Descuento de una falta en semana fija: sueldo semanal ÷ días pactados.
 * Con 6 días (y 1 de descanso) equivale al salario diario (÷ 7) más la parte
 * proporcional del descanso (LFT art. 69 y 72).
 */
export function lineaFalta(f: FaltaCaptura, tarifa: number, diasPactados: number): LineaRecibo {
  const inicio = f.fraccion < 1 ? "Media falta" : "Falta";
  const nota = f.nota?.trim() ? ` (${f.nota.trim()})` : "";
  if (f.tipo === "justificada") {
    return { tipo: "falta", descripcion: `${inicio} justificada el ${fechaConDia(f.fecha)}, se paga completo${nota}`, importe: 0 };
  }
  const monto = diasPactados > 0 ? redondear((tarifa / diasPactados) * f.fraccion) : 0;
  let descripcion = `${inicio}${f.tipo === "sin_aviso" ? " sin aviso" : " con permiso sin goce"} el ${fechaConDia(f.fecha)}`;
  if (diasPactados === 6) {
    const diario = redondear((tarifa / 7) * f.fraccion);
    descripcion += `: día ${tarifaTexto(diario)} + parte del descanso ${tarifaTexto(redondear(monto - diario))}`;
  } else {
    descripcion += `: ${f.fraccion < 1 ? "½" : "1"} de ${diasPactados} días pactados`;
  }
  return { tipo: "falta", descripcion: descripcion + nota, importe: monto === 0 ? 0 : -monto };
}

export function calcularRecibo(params: {
  formaPago: FormaPago;
  tarifa: number;
  pasaje: number;
  cantidad: number;
  extras: ExtraCaptura[];
  adelantos: AdelantoCaptura[];
  /** Faltas pendientes dentro del periodo; solo cuentan en semana fija. */
  faltas?: FaltaCaptura[];
  diasTrabajo?: number[];
  horasDia?: number | null;
}): { lineas: LineaRecibo[]; total: number } {
  const { formaPago, tarifa, pasaje, cantidad, extras, adelantos, faltas = [], diasTrabajo = [], horasDia } = params;
  const lineas: LineaRecibo[] = [];

  let trabajo = `${fmtCantidad(cantidad)} ${UNIDADES[formaPago]} × ${tarifaTexto(tarifa)}`;
  if (horasDia && horasDia < 8) {
    trabajo += ` · jornada reducida de ${fmtCantidad(horasDia)} h diarias`;
    if (diasTrabajo.length) trabajo += ` (${textoDiasCorto(diasTrabajo)})`;
  }
  lineas.push({ tipo: "trabajo", descripcion: trabajo, importe: redondear(cantidad * tarifa) });

  if (pasaje > 0) {
    const porDia = formaPago === "dia" || formaPago === "turno";
    lineas.push({
      tipo: "pasaje",
      descripcion: "Apoyo de pasaje",
      importe: porDia ? redondear(cantidad * pasaje) : pasaje,
    });
  }

  if (formaPago === "semana") {
    for (const f of [...faltas].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      lineas.push(lineaFalta(f, tarifa, diasTrabajo.length));
    }
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
