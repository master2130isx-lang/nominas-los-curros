export type Rol = "admin" | "encargado";
export type TipoTrabajador = "formal" | "informal_turno" | "informal_tarea" | "informal_semana";
export type FormaPago = "hora" | "turno" | "dia" | "tarea" | "semana";
export type EstadoRecibo = "sin_firma" | "firmado" | "cancelado";
export type PagoCuando = "dia_semana" | "cada_dia" | "al_terminar";
export type TipoConcepto = "trabajo" | "pasaje" | "extra" | "adelanto" | "prestamo" | "otro";

export interface Perfil {
  id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
}

export interface Trabajador {
  id: string;
  nombre: string;
  tipo: TipoTrabajador;
  actividad: string | null;
  forma_pago: FormaPago;
  tarifa: number;
  pasaje: number;
  pago_cuando: PagoCuando;
  /** 1 = lunes … 7 = domingo */
  pago_dia_semana: number | null;
  dias_trabajo: number[];
  horario: string | null;
  telefono: string | null;
  curp: string | null;
  fecha_ingreso: string | null;
  notas: string | null;
  activo: boolean;
  creado_en: string;
}

export interface Recibo {
  id: string;
  folio: number;
  trabajador_id: string;
  trabajador_nombre: string;
  trabajador_actividad: string | null;
  periodo_inicio: string;
  periodo_fin: string;
  fecha_pago: string;
  forma_pago: FormaPago;
  tarifa: number;
  cantidad: number;
  total: number;
  nota: string | null;
  estado: EstadoRecibo;
  foto_path: string | null;
  impresiones: number;
  creado_por: string;
  creado_en: string;
  motivo_cancelacion: string | null;
}

export interface Concepto {
  id: string;
  recibo_id: string;
  orden: number;
  tipo: TipoConcepto;
  descripcion: string;
  importe: number;
}

export interface Adelanto {
  id: string;
  trabajador_id: string;
  fecha: string;
  monto: number;
  descripcion: string | null;
  recibo_id: string | null;
}

export const TIPOS_TRABAJADOR: Record<TipoTrabajador, string> = {
  formal: "Formal",
  informal_turno: "Informal por turno o día",
  informal_tarea: "Informal por tarea",
  informal_semana: "Informal por semana",
};

export const FORMAS_PAGO: Record<FormaPago, string> = {
  hora: "Por hora",
  turno: "Por turno",
  dia: "Por día",
  tarea: "Por tarea",
  semana: "Por semana fija",
};

export const UNIDADES: Record<FormaPago, string> = {
  hora: "hora(s)",
  turno: "turno(s)",
  dia: "día(s)",
  tarea: "tarea(s)",
  semana: "semana(s)",
};
