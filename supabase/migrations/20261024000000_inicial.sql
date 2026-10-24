-- Esquema inicial de Nóminas Los Curros.
-- Se corre una vez en el SQL Editor de Supabase (o con `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type rol_usuario as enum ('admin', 'encargado');
create type tipo_trabajador as enum ('formal', 'informal_turno', 'informal_tarea', 'informal_semana');
create type forma_pago as enum ('hora', 'turno', 'dia', 'tarea', 'semana');
create type estado_recibo as enum ('sin_firma', 'firmado', 'cancelado');
create type tipo_concepto as enum ('trabajo', 'pasaje', 'extra', 'adelanto', 'prestamo', 'otro');

create or replace function hoy_mx() returns date
language sql stable as $$
  select (now() at time zone 'America/Mexico_City')::date
$$;

-- ---------------------------------------------------------------------------
-- Usuarios: solo quien tenga un perfil activo puede usar la plataforma.
-- Las cuentas se crean a mano en Supabase (Authentication > Users) y luego
-- se les agrega su fila en perfiles.
-- ---------------------------------------------------------------------------

create table perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol rol_usuario not null default 'encargado',
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create or replace function es_usuario_activo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and activo)
$$;

create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and activo and rol = 'admin')
$$;

-- ---------------------------------------------------------------------------
-- Trabajadores
-- ---------------------------------------------------------------------------

create table trabajadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  tipo tipo_trabajador not null,
  actividad text,
  forma_pago forma_pago not null,
  tarifa numeric(10, 2) not null check (tarifa >= 0),
  -- Apoyo de pasaje: por día o turno trabajado cuando la forma de pago es
  -- por día o turno; una vez por recibo en las demás.
  pasaje numeric(10, 2) not null default 0 check (pasaje >= 0),
  dia_pago text,
  horario text,
  telefono text,
  curp text,
  fecha_ingreso date,
  notas text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Recibos. Una vez creado, un recibo no se edita ni se borra: solo cambia de
-- estado (firmado o cancelado), se le adjunta la foto firmada y se cuentan
-- sus impresiones.
-- ---------------------------------------------------------------------------

create table contador_folios (
  id int primary key check (id = 1),
  ultimo int not null default 0
);
insert into contador_folios (id, ultimo) values (1, 0);

create table recibos (
  id uuid primary key default gen_random_uuid(),
  folio int not null unique,
  trabajador_id uuid not null references trabajadores (id),
  trabajador_nombre text not null,
  trabajador_actividad text,
  periodo_inicio date not null,
  periodo_fin date not null,
  fecha_pago date not null default hoy_mx(),
  forma_pago forma_pago not null,
  tarifa numeric(10, 2) not null,
  cantidad numeric(10, 2) not null check (cantidad > 0),
  total numeric(10, 2) not null check (total >= 0),
  nota text,
  estado estado_recibo not null default 'sin_firma',
  foto_path text,
  impresiones int not null default 0,
  creado_por uuid not null default auth.uid() references perfiles (id),
  creado_en timestamptz not null default now(),
  cancelado_por uuid references perfiles (id),
  cancelado_en timestamptz,
  motivo_cancelacion text,
  check (periodo_fin >= periodo_inicio)
);

create index recibos_fecha_pago_idx on recibos (fecha_pago);
create index recibos_trabajador_idx on recibos (trabajador_id);

create table recibo_conceptos (
  id uuid primary key default gen_random_uuid(),
  recibo_id uuid not null references recibos (id),
  orden int not null,
  tipo tipo_concepto not null,
  descripcion text not null,
  importe numeric(10, 2) not null
);

create index recibo_conceptos_recibo_idx on recibo_conceptos (recibo_id);

create table adelantos (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references trabajadores (id),
  fecha date not null default hoy_mx(),
  monto numeric(10, 2) not null check (monto > 0),
  descripcion text,
  recibo_id uuid references recibos (id),
  creado_por uuid not null default auth.uid() references perfiles (id),
  creado_en timestamptz not null default now()
);

create index adelantos_pendientes_idx on adelantos (trabajador_id) where recibo_id is null;

-- Solo se permiten los cambios de estado previstos en un recibo.
create or replace function proteger_recibo() returns trigger
language plpgsql as $$
begin
  if old.estado = 'cancelado' then
    raise exception 'Un recibo cancelado ya no se puede modificar';
  end if;
  if (new.folio, new.trabajador_id, new.trabajador_nombre, new.trabajador_actividad,
      new.periodo_inicio, new.periodo_fin, new.fecha_pago, new.forma_pago,
      new.tarifa, new.cantidad, new.total, new.nota, new.creado_por, new.creado_en)
     is distinct from
     (old.folio, old.trabajador_id, old.trabajador_nombre, old.trabajador_actividad,
      old.periodo_inicio, old.periodo_fin, old.fecha_pago, old.forma_pago,
      old.tarifa, old.cantidad, old.total, old.nota, old.creado_por, old.creado_en) then
    raise exception 'Los datos de un recibo no se pueden cambiar; cancélalo y haz uno nuevo';
  end if;
  if new.impresiones < old.impresiones then
    raise exception 'El contador de impresiones no puede bajar';
  end if;
  return new;
end;
$$;

create trigger recibos_proteger
before update on recibos
for each row execute function proteger_recibo();

create or replace function proteger_recibo_borrado() returns trigger
language plpgsql as $$
begin
  raise exception 'Los recibos no se borran; se cancelan';
end;
$$;

create trigger recibos_no_borrar
before delete on recibos
for each row execute function proteger_recibo_borrado();

create or replace function tocar_actualizado_en() returns trigger
language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger trabajadores_actualizado_en
before update on trabajadores
for each row execute function tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- Cálculo del recibo. Debe dar lo mismo que src/lib/calculo.ts, que se usa
-- para la vista previa en pantalla; la base de datos es la que manda.
-- ---------------------------------------------------------------------------

create or replace function crear_recibo(
  p_trabajador_id uuid,
  p_periodo_inicio date,
  p_periodo_fin date,
  p_fecha_pago date,
  p_cantidad numeric,
  p_extras jsonb default '[]'::jsonb,
  p_adelantos uuid[] default '{}',
  p_nota text default null
) returns recibos
language plpgsql security definer set search_path = public as $$
declare
  t trabajadores;
  r recibos;
  v_folio int;
  v_conceptos jsonb := '[]'::jsonb;
  v_concepto jsonb;
  v_total numeric(10, 2) := 0;
  v_importe numeric(10, 2);
  v_unidad text;
  v_extra jsonb;
  v_adelanto adelantos;
  v_adelantos_ids uuid[] := '{}';
  v_orden int := 0;
begin
  if not es_usuario_activo() then
    raise exception 'No tienes acceso';
  end if;

  select * into t from trabajadores where id = p_trabajador_id and activo;
  if not found then
    raise exception 'Trabajador no encontrado o dado de baja';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad trabajada debe ser mayor a cero';
  end if;

  -- 1. Se arman todos los conceptos y el total antes de guardar nada.
  v_unidad := case t.forma_pago
    when 'hora' then 'hora(s)'
    when 'turno' then 'turno(s)'
    when 'dia' then 'día(s)'
    when 'tarea' then 'tarea(s)'
    when 'semana' then 'semana(s)'
  end;
  v_importe := round(p_cantidad * t.tarifa, 2);
  v_conceptos := v_conceptos || jsonb_build_object(
    'tipo', 'trabajo',
    'descripcion', trim(trailing '.' from to_char(p_cantidad, 'FM999990.99')) || ' ' || v_unidad
                   || ' × $' || to_char(t.tarifa, 'FM999,990.00'),
    'importe', v_importe);
  v_total := v_total + v_importe;

  if t.pasaje > 0 then
    v_importe := case when t.forma_pago in ('dia', 'turno')
                      then round(p_cantidad * t.pasaje, 2) else t.pasaje end;
    v_conceptos := v_conceptos || jsonb_build_object(
      'tipo', 'pasaje', 'descripcion', 'Apoyo de pasaje', 'importe', v_importe);
    v_total := v_total + v_importe;
  end if;

  for v_extra in select * from jsonb_array_elements(coalesce(p_extras, '[]'::jsonb)) loop
    v_importe := abs((v_extra ->> 'importe')::numeric);
    if v_importe is null or v_importe = 0 then
      continue;
    end if;
    if coalesce(v_extra ->> 'tipo', '') not in ('extra', 'prestamo', 'otro') then
      raise exception 'Tipo de concepto no válido: %', v_extra ->> 'tipo';
    end if;
    if coalesce(trim(v_extra ->> 'descripcion'), '') = '' then
      raise exception 'Cada extra o descuento necesita una nota que diga por qué';
    end if;
    if v_extra ->> 'tipo' = 'prestamo' then
      v_importe := -v_importe;
    end if;
    v_conceptos := v_conceptos || jsonb_build_object(
      'tipo', v_extra ->> 'tipo', 'descripcion', trim(v_extra ->> 'descripcion'), 'importe', v_importe);
    v_total := v_total + v_importe;
  end loop;

  for v_adelanto in
    select * from adelantos
    where id = any (coalesce(p_adelantos, '{}'))
    order by fecha, creado_en
    for update
  loop
    if v_adelanto.trabajador_id <> t.id then
      raise exception 'El adelanto no es de este trabajador';
    end if;
    if v_adelanto.recibo_id is not null then
      raise exception 'Ese adelanto ya se descontó en otro recibo';
    end if;
    v_conceptos := v_conceptos || jsonb_build_object(
      'tipo', 'adelanto',
      'descripcion', 'Descuento de adelanto del ' || to_char(v_adelanto.fecha, 'DD/MM/YYYY')
                     || coalesce(' (' || nullif(trim(v_adelanto.descripcion), '') || ')', ''),
      'importe', -v_adelanto.monto);
    v_total := v_total - v_adelanto.monto;
    v_adelantos_ids := v_adelantos_ids || v_adelanto.id;
  end loop;

  if cardinality(v_adelantos_ids) <> cardinality(coalesce(p_adelantos, '{}')) then
    raise exception 'Algún adelanto no existe';
  end if;
  if v_total < 0 then
    raise exception 'Los descuentos son mayores que el pago (total %)', v_total;
  end if;

  -- 2. Folio consecutivo: el contador se bloquea hasta que termina la
  -- transacción, así no se repite ni se salta.
  update contador_folios set ultimo = ultimo + 1 where id = 1 returning ultimo into v_folio;

  insert into recibos (folio, trabajador_id, trabajador_nombre, trabajador_actividad,
                       periodo_inicio, periodo_fin, fecha_pago, forma_pago, tarifa,
                       cantidad, total, nota)
  values (v_folio, t.id, t.nombre, t.actividad, p_periodo_inicio, p_periodo_fin,
          coalesce(p_fecha_pago, hoy_mx()), t.forma_pago, t.tarifa, p_cantidad, v_total,
          nullif(trim(p_nota), ''))
  returning * into r;

  for v_concepto in select * from jsonb_array_elements(v_conceptos) loop
    v_orden := v_orden + 1;
    insert into recibo_conceptos (recibo_id, orden, tipo, descripcion, importe)
    values (r.id, v_orden, (v_concepto ->> 'tipo')::tipo_concepto,
            v_concepto ->> 'descripcion', (v_concepto ->> 'importe')::numeric);
  end loop;

  update adelantos set recibo_id = r.id where id = any (v_adelantos_ids);

  return r;
end;
$$;

create or replace function cancelar_recibo(p_recibo_id uuid, p_motivo text) returns recibos
language plpgsql security definer set search_path = public as $$
declare
  r recibos;
begin
  if not es_admin() then
    raise exception 'Solo el administrador puede cancelar recibos';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Escribe el motivo de la cancelación';
  end if;
  update recibos
     set estado = 'cancelado', cancelado_por = auth.uid(), cancelado_en = now(),
         motivo_cancelacion = trim(p_motivo)
   where id = p_recibo_id
  returning * into r;
  if not found then
    raise exception 'Recibo no encontrado';
  end if;
  -- Los adelantos descontados vuelven a quedar pendientes.
  update adelantos set recibo_id = null where recibo_id = r.id;
  return r;
end;
$$;

create or replace function registrar_impresion(p_recibos uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not es_usuario_activo() then
    raise exception 'No tienes acceso';
  end if;
  update recibos set impresiones = impresiones + 1
   where id = any (p_recibos) and estado <> 'cancelado';
end;
$$;

create or replace function marcar_firmado(p_recibo_id uuid, p_foto_path text) returns recibos
language plpgsql security definer set search_path = public as $$
declare
  r recibos;
begin
  if not es_usuario_activo() then
    raise exception 'No tienes acceso';
  end if;
  if p_foto_path is null or p_foto_path not like p_recibo_id::text || '/%' then
    raise exception 'Foto no válida';
  end if;
  update recibos set estado = 'firmado', foto_path = p_foto_path
   where id = p_recibo_id and estado <> 'cancelado'
  returning * into r;
  if not found then
    raise exception 'Recibo no encontrado o cancelado';
  end if;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos (RLS): solo usuarios con perfil activo. Los recibos solo se crean
-- y cambian con las funciones de arriba.
-- ---------------------------------------------------------------------------

alter table perfiles enable row level security;
alter table trabajadores enable row level security;
alter table contador_folios enable row level security;
alter table recibos enable row level security;
alter table recibo_conceptos enable row level security;
alter table adelantos enable row level security;

create policy perfiles_ver on perfiles for select to authenticated
  using (id = auth.uid() or es_usuario_activo());

create policy trabajadores_ver on trabajadores for select to authenticated
  using (es_usuario_activo());
create policy trabajadores_crear on trabajadores for insert to authenticated
  with check (es_usuario_activo());
create policy trabajadores_editar on trabajadores for update to authenticated
  using (es_usuario_activo()) with check (es_usuario_activo());

create policy recibos_ver on recibos for select to authenticated
  using (es_usuario_activo());
create policy conceptos_ver on recibo_conceptos for select to authenticated
  using (es_usuario_activo());

create policy adelantos_ver on adelantos for select to authenticated
  using (es_usuario_activo());
create policy adelantos_crear on adelantos for insert to authenticated
  with check (es_usuario_activo() and recibo_id is null);

revoke all on function crear_recibo, cancelar_recibo, registrar_impresion, marcar_firmado from public, anon;
grant execute on function crear_recibo, cancelar_recibo, registrar_impresion, marcar_firmado to authenticated;
