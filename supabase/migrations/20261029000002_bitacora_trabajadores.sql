-- Solo el administrador cambia la tarifa o da de baja (o reactiva) a un
-- trabajador, y queda una bitácora de solo lectura con quién, cuándo, el valor
-- anterior y el nuevo.
--
-- Los encargados siguen pudiendo dar de alta trabajadores y editar sus demás
-- datos (nombre, horario, días, teléfono…). Los cambios hechos desde el SQL
-- Editor de Supabase (rol postgres) no se bloquean, pero también se registran.
--
-- No cambia filas existentes: crea una tabla nueva y dos triggers.
--
-- Para revertir:
--   drop trigger if exists trabajadores_registrar on trabajadores;
--   drop trigger if exists trabajadores_solo_admin on trabajadores;
--   drop function if exists trabajadores_registrar();
--   drop function if exists trabajadores_solo_admin();
--   drop table if exists trabajadores_bitacora;

create table trabajadores_bitacora (
  id bigint generated always as identity primary key,
  trabajador_id uuid not null references trabajadores (id),
  campo text not null,
  valor_anterior text,
  valor_nuevo text,
  cambiado_por uuid references perfiles (id) default auth.uid(),
  cambiado_en timestamptz not null default now()
);

create index trabajadores_bitacora_trabajador_idx on trabajadores_bitacora (trabajador_id, cambiado_en desc);

alter table trabajadores_bitacora enable row level security;

-- La consultan todos los usuarios activos; nadie la escribe ni la edita desde la
-- aplicación (sin políticas de insert/update/delete y sin permisos).
create policy bitacora_ver on trabajadores_bitacora for select to authenticated
  using (es_usuario_activo());
revoke insert, update, delete, truncate on trabajadores_bitacora from public, anon, authenticated;

create or replace function trabajadores_solo_admin() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon')
     and not es_admin()
     and (new.tarifa is distinct from old.tarifa or new.activo is distinct from old.activo) then
    raise exception 'Solo el administrador puede cambiar la tarifa o dar de baja a un trabajador';
  end if;
  return new;
end;
$$;

create trigger trabajadores_solo_admin
before update on trabajadores
for each row execute function trabajadores_solo_admin();

-- security definer: escribe en la bitácora aunque el usuario no tenga permiso.
create or replace function trabajadores_registrar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into trabajadores_bitacora (trabajador_id, campo, valor_anterior, valor_nuevo)
    values (new.id, 'alta', null, new.forma_pago || ' ' || new.tarifa::text);
    return new;
  end if;
  if new.tarifa is distinct from old.tarifa then
    insert into trabajadores_bitacora (trabajador_id, campo, valor_anterior, valor_nuevo)
    values (new.id, 'tarifa', old.tarifa::text, new.tarifa::text);
  end if;
  if new.pasaje is distinct from old.pasaje then
    insert into trabajadores_bitacora (trabajador_id, campo, valor_anterior, valor_nuevo)
    values (new.id, 'pasaje', old.pasaje::text, new.pasaje::text);
  end if;
  if new.forma_pago is distinct from old.forma_pago then
    insert into trabajadores_bitacora (trabajador_id, campo, valor_anterior, valor_nuevo)
    values (new.id, 'forma_pago', old.forma_pago::text, new.forma_pago::text);
  end if;
  if new.activo is distinct from old.activo then
    insert into trabajadores_bitacora (trabajador_id, campo, valor_anterior, valor_nuevo)
    values (new.id, 'activo', old.activo::text, new.activo::text);
  end if;
  return new;
end;
$$;

create trigger trabajadores_registrar
after insert or update on trabajadores
for each row execute function trabajadores_registrar();
