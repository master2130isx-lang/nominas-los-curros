-- Día de pago fijo y días de trabajo por trabajador, para la vista de Hoy.
--
-- Días de la semana como en ISO: 1 = lunes … 7 = domingo.
--   pago_cuando = 'dia_semana'  → se le paga el día pago_dia_semana (los de semana fija)
--   pago_cuando = 'cada_dia'    → se le paga cada día que trabaja
--   pago_cuando = 'al_terminar' → se le paga al terminar su tarea

create type pago_cuando as enum ('dia_semana', 'cada_dia', 'al_terminar');

alter table trabajadores
  add column pago_cuando pago_cuando not null default 'cada_dia',
  add column pago_dia_semana smallint check (pago_dia_semana between 1 and 7),
  add column dias_trabajo smallint[] not null default '{}'
    check (dias_trabajo <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]);

alter table trabajadores
  add constraint trabajadores_dia_de_pago_check
  check ((pago_cuando = 'dia_semana') = (pago_dia_semana is not null));

-- ---------------------------------------------------------------------------
-- Pasar los datos que ya había en texto libre ("Sábado", "Diario", "Lunes a
-- sábado de 7am a 2pm"…) a los campos nuevos. Lo que no se entienda se queda
-- vacío para marcarlo a mano.
-- ---------------------------------------------------------------------------

create function pg_temp.dia_numero(palabra text) returns smallint
language sql immutable as $$
  select case translate(lower(palabra), 'áéíóú', 'aeiou')
    when 'lunes' then 1 when 'martes' then 2 when 'miercoles' then 3
    when 'jueves' then 4 when 'viernes' then 5 when 'sabado' then 6
    when 'domingo' then 7 end::smallint
$$;

-- "Lunes a sábado" → {1..6}; "Jueves a martes" → {4,5,6,7,1,2};
-- "Sábado y domingo", "Martes, jueves y sábado", "Solo jueves" → esos días.
create function pg_temp.dias_desde_texto(texto text) returns smallint[]
language plpgsql immutable as $$
declare
  limpio text := translate(lower(coalesce(texto, '')), 'áéíóú', 'aeiou');
  rango text[];
  desde smallint;
  hasta smallint;
  resultado smallint[] := '{}';
  palabra text;
begin
  rango := regexp_match(limpio,
    '(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s+a\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)');
  if rango is not null then
    desde := pg_temp.dia_numero(rango[1]);
    hasta := pg_temp.dia_numero(rango[2]);
    loop
      resultado := resultado || desde;
      exit when desde = hasta;
      desde := desde % 7 + 1;
    end loop;
  else
    for palabra in
      select m[1] from regexp_matches(limpio, '(lunes|martes|miercoles|jueves|viernes|sabado|domingo)', 'g') as m
    loop
      if not pg_temp.dia_numero(palabra) = any (resultado) then
        resultado := resultado || pg_temp.dia_numero(palabra);
      end if;
    end loop;
  end if;
  return (select coalesce(array_agg(d order by d), '{}') from unnest(resultado) as d);
end;
$$;

update trabajadores set dias_trabajo = pg_temp.dias_desde_texto(horario);

update trabajadores
   set pago_cuando = 'dia_semana',
       pago_dia_semana = pg_temp.dia_numero(substring(translate(lower(dia_pago), 'áéíóú', 'aeiou')
                          from '(lunes|martes|miercoles|jueves|viernes|sabado|domingo)'))
 where forma_pago = 'semana'
   and translate(lower(coalesce(dia_pago, '')), 'áéíóú', 'aeiou')
       ~ '^\s*(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s*$';

update trabajadores
   set pago_cuando = 'al_terminar'
 where forma_pago = 'tarea' and pago_cuando = 'cada_dia';

-- El texto libre ya no se usa.
alter table trabajadores drop column dia_pago;
