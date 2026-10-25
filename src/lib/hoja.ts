import type { DatosTrabajadorHoja } from "@/componentes/ReciboHoja";
import { semanaDe } from "./fechas";
import { cantidad, rango } from "./formato";
import { compararConMinimo } from "./ley";
import { textoDias } from "./programa";
import { FORMAS_PAGO, UNIDADES, type FormaPago, type Trabajador } from "./tipos";

export type TrabajadorHoja = Pick<
  Trabajador,
  "curp" | "rfc" | "nss" | "fecha_ingreso" | "horario" | "dias_trabajo" | "horas_dia" | "alimentacion" | "pago_cuando"
>;

/** Datos del trabajador para el comprobante, con la tarifa y forma de pago del recibo. */
export function datosTrabajadorHoja(
  t: TrabajadorHoja | undefined,
  pago: { formaPago: FormaPago; tarifa: number; cantidad: number; fechaPago: string },
  /** Inicio de la plataforma: la primera hoja semanal empieza ese día. */
  inicio: string,
): DatosTrabajadorHoja {
  const semana = pago.fechaPago ? semanaDe(pago.fechaPago) : null;
  const minimo = t
    ? compararConMinimo({
        forma_pago: pago.formaPago,
        tarifa: pago.tarifa,
        dias_trabajo: t.dias_trabajo,
        horas_dia: t.horas_dia === null ? null : Number(t.horas_dia),
      })
    : null;
  return {
    curp: t?.curp ?? null,
    rfc: t?.rfc ?? null,
    nss: t?.nss ?? null,
    fechaIngreso: t?.fecha_ingreso ?? null,
    formaPago: FORMAS_PAGO[pago.formaPago],
    cantidad: pago.cantidad > 0 ? `${cantidad(pago.cantidad)} ${UNIDADES[pago.formaPago]}` : "—",
    horario: t?.horario ?? null,
    dias: t && t.dias_trabajo.length ? textoDias(t.dias_trabajo).toLowerCase() : "",
    alimentacion: t?.alimentacion ?? true,
    bajoMinimo: minimo !== null && !minimo.arriba,
    firmaSemanal: t?.pago_cuando === "cada_dia",
    semanaFirma: semana ? rango(semana.inicio < inicio ? inicio : semana.inicio, semana.fin) : null,
  };
}
