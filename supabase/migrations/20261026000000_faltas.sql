-- Faltas, jornada pactada y constancia de condiciones de trabajo.
--
-- Toda falta se anota. En los recibos de semana fija, las faltas del periodo
-- entran solas: las que se descuentan como línea de descuento y las
-- justificadas como nota de $0, para que el recibo firmado deje constancia.
--
-- Descuento por falta en semana fija = sueldo semanal ÷ días pactados.
-- Con 6 días y 1 de descanso es el salario diario (semanal ÷ 7) más la parte
-- proporcional del descanso (1/6 del salario diario): LFT art. 69 y 72.
-- Ejemplo: $2,184 ÷ 6 = $364 = $312 del día + $52 del descanso.

alter type tipo_concepto add value if not exists 'falta';

create type tipo_falta as enum ('sin_aviso', 'sin_goce', 'justificada');

create table faltas (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references trabajadores (id),
  fecha date not null,
  tipo tipo_falta not null,
  -- 1 = día completo, 0.5 = media falta (llegó tarde o se fue a medio turno)
  fraccion numeric(2, 1) not null default 1 check (fraccion in (0.5, 1)),
  nota text,
  recibo_id uuid references recibos (id),
  creado_por uuid not null default auth.uid() references perfiles (id),
  creado_en timestamptz not null default now(),
  unique (trabajador_id, fecha)
);

create index faltas_fecha_idx on faltas (fecha);
create index faltas_pendientes_idx on faltas (trabajador_id, fecha) where recibo_id is null;

alter table faltas enable row level security;

create policy faltas_ver on faltas for select to authenticated
  using (es_usuario_activo());
create policy faltas_crear on faltas for insert to authenticated
  with check (es_usuario_activo() and recibo_id is null);
-- Una falta mal marcada se borra mientras no esté en un recibo.
create policy faltas_borrar on faltas for delete to authenticated
  using (es_usuario_activo() and recibo_id is null);

-- Jornada pactada (horas por día) y constancia firmada.
alter table trabajadores
  add column horas_dia numeric(4, 2) check (horas_dia > 0 and horas_dia <= 24),
  add column constancia_foto_path text,
  add column constancia_firmada_en date;

-- ---------------------------------------------------------------------------
-- Textos que salen en el recibo. Deben coincidir con src/lib/calculo.ts.
-- ---------------------------------------------------------------------------

create or replace function texto_dias(p_dias smallint[]) returns text
language sql immutable as $$
  select case
    when cardinality(p_dias) = 7 then 'todos los días'
    else (select string_agg((array['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'])[d], ', ' order by d)
            from unnest(p_dias) as d)
  end
$$;

create or replace function fecha_con_dia(p_fecha date) returns text
language sql immutable as $$
  select (array['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'])[extract(isodow from p_fecha)::int]
         || ' ' || to_char(p_fecha, 'DD/MM/YYYY')
$$;

create or replace function dinero_texto(p numeric) returns text
language sql immutable as $$
  select '$' || to_char(p, 'FM999,990.00')
$$;

-- ---------------------------------------------------------------------------
-- crear_recibo con faltas y jornada reducida.
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
  v_descripcion text;
  v_extra jsonb;
  v_adelanto adelantos;
  v_adelantos_ids uuid[] := '{}';
  v_falta faltas;
  v_faltas_ids uuid[] := '{}';
  v_dias int;
  v_diario numeric;
  v_descanso numeric;
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
  v_descripcion := trim(trailing '.' from to_char(p_cantidad, 'FM999990.99')) || ' ' || v_unidad
                   || ' × ' || dinero_texto(t.tarifa);
  if t.horas_dia is not null and t.horas_dia < 8 then
    v_descripcion := v_descripcion || ' · jornada reducida de '
                     || trim(trailing '.' from to_char(t.horas_dia, 'FM990.99')) || ' h diarias'
                     || coalesce(' (' || texto_dias(nullif(t.dias_trabajo, '{}')) || ')', '');
  end if;
  v_conceptos := v_conceptos || jsonb_build_object('tipo', 'trabajo', 'descripcion', v_descripcion, 'importe', v_importe);
  v_total := v_total + v_importe;

  if t.pasaje > 0 then
    v_importe := case when t.forma_pago in ('dia', 'turno')
                      then round(p_cantidad * t.pasaje, 2) else t.pasaje end;
    v_conceptos := v_conceptos || jsonb_build_object(
      'tipo', 'pasaje', 'descripcion', 'Apoyo de pasaje', 'importe', v_importe);
    v_total := v_total + v_importe;
  end if;

  -- Faltas del periodo (solo semana fija; a los demás se les paga lo trabajado).
  if t.forma_pago = 'semana' then
    v_dias := cardinality(t.dias_trabajo);
    for v_falta in
      select * from faltas
      where trabajador_id = t.id and recibo_id is null
        and fecha between p_periodo_inicio and p_periodo_fin
      order by fecha
      for update
    loop
      if v_falta.tipo = 'justificada' then
        v_importe := 0;
        v_descripcion := case when v_falta.fraccion < 1 then 'Media falta' else 'Falta' end
                         || ' justificada el ' || fecha_con_dia(v_falta.fecha) || ', se paga completo';
      else
        if v_dias = 0 then
          raise exception 'Marca los días que trabaja % para poder descontar sus faltas', t.nombre;
        end if;
        v_importe := -round(t.tarifa / v_dias * v_falta.fraccion, 2);
        v_descripcion := case when v_falta.fraccion < 1 then 'Media falta' else 'Falta' end
                         || case v_falta.tipo when 'sin_aviso' then ' sin aviso' else ' con permiso sin goce' end
                         || ' el ' || fecha_con_dia(v_falta.fecha);
        if v_dias = 6 then
          v_diario := round(t.tarifa / 7 * v_falta.fraccion, 2);
          v_descanso := -v_importe - v_diario;
          v_descripcion := v_descripcion || ': día ' || dinero_texto(v_diario)
                           || ' + parte del descanso ' || dinero_texto(v_descanso);
        else
          v_descripcion := v_descripcion || ': ' || case when v_falta.fraccion < 1 then '½' else '1' end
                           || ' de ' || v_dias || ' días pactados';
        end if;
      end if;
      if nullif(trim(v_falta.nota), '') is not null then
        v_descripcion := v_descripcion || ' (' || trim(v_falta.nota) || ')';
      end if;
      v_conceptos := v_conceptos || jsonb_build_object('tipo', 'falta', 'descripcion', v_descripcion, 'importe', v_importe);
      v_total := v_total + v_importe;
      v_faltas_ids := v_faltas_ids || v_falta.id;
    end loop;
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
  update faltas set recibo_id = r.id where id = any (v_faltas_ids);

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
  -- Los adelantos descontados y las faltas vuelven a quedar pendientes.
  update adelantos set recibo_id = null where recibo_id = r.id;
  update faltas set recibo_id = null where recibo_id = r.id;
  return r;
end;
$$;
