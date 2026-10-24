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

/** Préstamo o adelanto con saldo pendiente. */
export interface AdelantoCaptura {
  fecha: string;
  saldo: number;
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
 * Con 6 días (y 1 de descanso) la falta sin aviso es el salario diario (÷ 7)
 * más la parte proporcional del descanso (LFT art. 69 y 72); el permiso sin
 * goce es solo el salario diario.
 */
export function lineaFalta(f: FaltaCaptura, tarifa: number, diasPactados: number): LineaRecibo {
  const inicio = f.fraccion < 1 ? "Media falta" : "Falta";
  const nota = f.nota?.trim() ? ` (${f.nota.trim()})` : "";
  if (f.tipo === "justificada") {
    return { tipo: "falta", descripcion: `${inicio} justificada el ${fechaConDia(f.fecha)}, se paga completo${nota}`, importe: 0 };
  }
  let monto = diasPactados > 0 ? redondear((tarifa / diasPactados) * f.fraccion) : 0;
  let descripcion = `${inicio}${f.tipo === "sin_aviso" ? " sin aviso" : " con permiso sin goce"} el ${fechaConDia(f.fecha)}`;
  if (diasPactados === 6 && f.tipo === "sin_goce") {
    monto = redondear((tarifa / 7) * f.fraccion);
    descripcion += `: solo el día ${tarifaTexto(monto)}`;
  } else if (diasPactados === 6) {
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
  /** Préstamos con saldo del trabajador, para repartir el abono. */
  adelantos: AdelantoCaptura[];
  /** Lo que el trabajador decidió abonar esta vez; se aplica primero al más viejo. */
  abono?: number;
  /** Faltas pendientes dentro del periodo; solo cuentan en semana fija. */
  faltas?: FaltaCaptura[];
  diasTrabajo?: number[];
  horasDia?: number | null;
}): { lineas: LineaRecibo[]; total: number } {
  const { formaPago, tarifa, pasaje, cantidad, extras, adelantos, abono = 0, faltas = [], diasTrabajo = [], horasDia } = params;
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

  let resta = redondear(Math.max(0, abono));
  for (const a of [...adelantos].sort((x, y) => x.fecha.localeCompare(y.fecha))) {
    if (resta <= 0) break;
    if (a.saldo <= 0) continue;
    const aplicado = Math.min(resta, a.saldo);
    resta = redondear(resta - aplicado);
    const nota = a.descripcion?.trim();
    const queda = redondear(a.saldo - aplicado);
    lineas.push({
      tipo: "adelanto",
      descripcion: `Abono a préstamo del ${fechaCorta(a.fecha)}${nota ? ` (${nota})` : ""}${
        queda === 0 ? ", queda pagado" : `, resta ${tarifaTexto(queda)}`
      }`,
      importe: -aplicado,
    });
  }

  const total = redondear(lineas.reduce((s, l) => s + l.importe, 0));
  return { lineas, total };
}
