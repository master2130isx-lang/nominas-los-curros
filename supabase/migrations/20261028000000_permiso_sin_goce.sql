-- Permiso sin goce: solo se deja de pagar el día.
--
-- Decidido por el negocio: cuando el trabajador pide permiso, no se le paga el
-- día pero no se le penaliza. Con 6 días y 1 de descanso se descuenta el
-- salario diario (semanal ÷ 7) sin la parte proporcional del descanso. La falta
-- sin aviso sigue descontando el día más la parte del descanso.

create or replace function crear_recibo(
  p_trabajador_id uuid,
  p_periodo_inicio date,
  p_periodo_fin date,
  p_fecha_pago date,
  p_cantidad numeric,
  p_extras jsonb default '[]'::jsonb,
  p_abono numeric default 0,
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
  v_prestamo adelantos_saldo;
  v_resta numeric(10, 2);
  v_aplicado numeric(10, 2);
  v_abonos jsonb := '[]'::jsonb;
  v_abono jsonb;
  v_debe numeric(10, 2);
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
        if v_dias = 6 and v_falta.tipo = 'sin_goce' then
          -- Con permiso solo se deja de pagar el día; no se toca el descanso.
          v_importe := -round(t.tarifa / 7 * v_falta.fraccion, 2);
          v_descripcion := v_descripcion || ': solo el día ' || dinero_texto(-v_importe);
        elsif v_dias = 6 then
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

  -- Abono voluntario a préstamos y adelantos: el trabajador decide cuánto;
  -- se aplica primero al más viejo y no puede pasar del saldo.
  v_resta := round(coalesce(p_abono, 0), 2);
  if v_resta < 0 then
    raise exception 'El abono no puede ser negativo';
  end if;
  if v_resta > 0 then
    perform 1 from adelantos where trabajador_id = t.id for update;
    select coalesce(sum(saldo), 0) into v_debe from adelantos_saldo where trabajador_id = t.id;
    if v_resta > v_debe then
      raise exception 'El abono (%) es mayor que lo que debe (%)', dinero_texto(v_resta), dinero_texto(v_debe);
    end if;
    for v_prestamo in
      select * from adelantos_saldo
      where trabajador_id = t.id and saldo > 0
      order by fecha, creado_en
    loop
      exit when v_resta = 0;
      v_aplicado := least(v_resta, v_prestamo.saldo);
      v_resta := v_resta - v_aplicado;
      v_conceptos := v_conceptos || jsonb_build_object(
        'tipo', 'adelanto',
        'descripcion', 'Abono a préstamo del ' || to_char(v_prestamo.fecha, 'DD/MM/YYYY')
                       || coalesce(' (' || nullif(trim(v_prestamo.descripcion), '') || ')', '')
                       || case when v_prestamo.saldo - v_aplicado = 0 then ', queda pagado'
                               else ', resta ' || dinero_texto(v_prestamo.saldo - v_aplicado) end,
        'importe', -v_aplicado);
      v_total := v_total - v_aplicado;
      v_abonos := v_abonos || jsonb_build_object('adelanto_id', v_prestamo.id, 'monto', v_aplicado);
    end loop;
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

  for v_abono in select * from jsonb_array_elements(v_abonos) loop
    insert into abonos (adelanto_id, recibo_id, monto)
    values ((v_abono ->> 'adelanto_id')::uuid, r.id, (v_abono ->> 'monto')::numeric);
  end loop;
  update faltas set recibo_id = r.id where id = any (v_faltas_ids);

  return r;
end;
$$;

