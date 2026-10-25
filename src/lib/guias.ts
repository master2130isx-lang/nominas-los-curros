// Guías breves para los encargados: pasos numerados de cada apartado del menú.

export type Apartado = "hoy" | "asistencia" | "semana" | "nuevo" | "recibos" | "faltas" | "trabajadores" | "prestamos";

export const GUIAS: Record<Apartado, { titulo: string; pasos: string[]; consejo?: string }> = {
  hoy: {
    titulo: "Pagos del día",
    pasos: [
      "Revisa las tarjetas de arriba: a cuántos les toca cobrar hoy, cuánto se ha pagado y si quedó algo pendiente.",
      "En “¿Quién faltó?”, toca “Marcar falta” en quien no vino, escoge el tipo y guarda.",
      "En “Por cobrar”, palomea a quienes vas a pagar y corrige la cantidad si trabajaron más o menos.",
      "Toca “Hacer recibos e imprimir”: se guardan con folio y se abre la hoja para imprimir.",
      "Si alguien quedó pendiente de otro día, hazle su recibo o márcale la falta en “Pendientes”.",
    ],
    consejo: "Con “Anterior” y “Siguiente” te mueves de día; no se puede ir antes del primer día de la plataforma.",
  },
  asistencia: {
    titulo: "Asistencia de la semana",
    pasos: [
      "Cada renglón es un trabajador y cada cuadro un día de la semana.",
      "Toca el cuadro del día en que alguien faltó.",
      "Escoge el tipo de falta; si solo faltó medio día, marca “Solo medio día”.",
      "Toca “Guardar”: el cuadro se pinta del color de la falta.",
      "Para corregirla o quitarla, vuelve a tocar el cuadro.",
    ],
    consejo: "Los cuadros verdes ya están pagados en un recibo y no se pueden cambiar.",
  },
  semana: {
    titulo: "Semana",
    pasos: [
      "Revisa quién ya cobró en la semana y quién sigue pendiente, agrupados por día de pago.",
      "Toca “Hacer recibo” para pagarle a quien falte.",
      "Toca “Imprimir recibos de la semana” si necesitas reimprimirlos todos.",
      "Los que cobran cada día firman una sola vez: imprime la “Hoja semanal para firmar” el día de raya.",
      "Cuando esté firmada, sube la foto en esa hoja y sus recibos quedan como firmados.",
    ],
  },
  nuevo: {
    titulo: "Nuevo recibo",
    pasos: [
      "Escoge al trabajador; el periodo y la cantidad se llenan solos.",
      "Revisa las fechas del periodo y el día de pago.",
      "Marca los días trabajados o escribe la cantidad (medio día = 0.5).",
      "Agrega extras o descuentos con su motivo, y lo que quiera abonar a sus préstamos.",
      "Revisa la vista previa y toca “Guardar recibo”: se asigna el folio y ya no se puede editar.",
    ],
  },
  recibos: {
    titulo: "Recibos",
    pasos: [
      "Busca por trabajador o por estado y toca “Filtrar”.",
      "Toca el folio para abrir el recibo.",
      "Imprime o reimprime desde el recibo; desde la segunda vez sale como REIMPRESIÓN.",
      "Sube la foto del recibo firmado para que quede como “firmado”.",
      "Si hay un error, solo el administrador puede cancelarlo; luego se hace uno nuevo.",
    ],
  },
  faltas: {
    titulo: "Faltas",
    pasos: [
      "Escoge al trabajador y el día que faltó.",
      "Escoge el tipo: sin aviso, permiso sin goce o justificada con pago.",
      "Marca “Solo medio día” si llegó tarde o se fue a medio turno, y escribe el motivo si quieres.",
      "Toca “Anotar falta”. En los de semana fija se descuenta sola en su siguiente recibo.",
      "En la lista de abajo puedes corregir una falta pendiente con “Editar”.",
    ],
    consejo: "Si el día ya está pagado en un recibo, la plataforma te avisa con el folio y no la guarda.",
  },
  trabajadores: {
    titulo: "Trabajadores",
    pasos: [
      "Toca “Agregar trabajador” o el nombre de uno para abrir su ficha.",
      "Llena sus datos personales, puesto y contrato.",
      "Escoge la forma de pago, la tarifa, el pasaje y si se le da de comer.",
      "Marca los días que trabaja y su horario de entrada y salida.",
      "Guarda y, en su ficha, adjunta documentos (INE, contrato…) e imprime la constancia de condiciones.",
    ],
    consejo: "La tarifa, el salario y las bajas solo los cambia el administrador; cada cambio queda en el historial.",
  },
  prestamos: {
    titulo: "Préstamos",
    pasos: [
      "Escoge al trabajador, escribe el monto y la fecha del préstamo o adelanto.",
      "Toca “Registrar”: queda con su saldo pendiente.",
      "Al hacer su recibo, escribe cuánto quiere abonar esa vez (puede ser $0).",
      "El abono se aplica primero al préstamo más viejo y el recibo dice cuánto resta.",
    ],
  },
};
