"use client";

import { ReciboHoja, type DatosHoja } from "@/componentes/ReciboHoja";
import { datosTrabajadorHoja } from "@/lib/hoja";
import type { Trabajador } from "@/lib/tipos";

/** Comprobante en vivo mientras se captura; se descarga aparte del formulario. */
export default function VistaPrevia({
  datos,
  trabajador,
  cantidad,
  minimo,
}: {
  datos: Omit<DatosHoja, "datos">;
  trabajador: Trabajador | undefined;
  cantidad: number;
  minimo: string;
}) {
  const t = trabajador;
  return (
    <ReciboHoja
      datos={{
        ...datos,
        datos: t
          ? datosTrabajadorHoja(t, { formaPago: t.forma_pago, tarifa: t.tarifa, cantidad, fechaPago: datos.fechaPago }, minimo)
          : undefined,
      }}
    />
  );
}
