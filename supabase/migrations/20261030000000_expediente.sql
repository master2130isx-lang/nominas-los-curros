-- Expediente laboral del trabajador, documentos adjuntos y alimentación.
--
-- Agrega columnas opcionales (las filas existentes quedan con null, salvo
-- alimentacion, que toma el valor por omisión true: la comida se da sin costo).
-- El salario diario registrado se trata igual que la tarifa: solo lo cambia el
-- administrador y queda en la bitácora.
--
-- Para revertir:
--   drop table if exists trabajador_documentos;
--   alter table trabajadores drop column if exists fecha_nacimiento, drop column if exists rfc,
--     drop column if exists nss, drop column if exists domicilio, drop column if exists contacto_emergencia,
--     drop column if exists telefono_emergencia, drop column if exists tipo_contrato,
--     drop column if exists salario_diario, drop column if exists alimentacion;
--   (y volver a correr 20261029000002_bitacora_trabajadores.sql para restaurar sus dos funciones)

alter table trabajadores
  add column fecha_nacimiento date,
  add column rfc text check (rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
  add column nss text check (nss ~ '^[0-9]{11}$'),
  add column domicilio text,
  add column contacto_emergencia text,
  add column telefono_emergencia text,
  add column tipo_contrato text check (tipo_contrato in ('indeterminado', 'determinado', 'obra', 'temporada', 'prueba', 'capacitacion')),
  add column salario_diario numeric(10, 2) check (salario_diario >= 0),
  add column alimentacion boolean not null default true;

create table trabajador_documentos (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references trabajadores (id),
  nombre text not null check (length(trim(nombre)) > 0),
  ruta text not null,
  subido_por uuid references perfiles (id) default auth.uid(),
  subido_en timestamptz not null default now(),
  check (ruta like 'documentos/' || trabajador_id::text || '/%')
);

create index trabajador_documentos_trabajador_idx on trabajador_documentos (trabajador_id, subido_en desc);

alter table trabajador_documentos enable row level security;
create policy documentos_ver on trabajador_documentos for select to authenticated
  using (es_usuario_activo());
create policy documentos_subir on trabajador_documentos for insert to authenticated
  with check (es_usuario_activo());

-- Salario diario: mismo trato que la tarifa (solo admin, con bitácora).
create or replace function trabajadores_solo_admin() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon')
     and not es_admin()
     and (new.tarifa is distinct from old.tarifa
          or new.activo is distinct from old.activo
          or new.salario_diario is distinct from old.salario_diario) then
    raise exception 'Solo el administrador puede cambiar la tarifa, el salario o dar de baja a un trabajador';
  end if;
  return new;
end;
$$;

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
  if new.salario_diario is distinct from old.salario_diario then
    insert into trabajadores_bitacora (trabajador_id, campo, valor_anterior, valor_nuevo)
    values (new.id, 'salario_diario', old.salario_diario::text, new.salario_diario::text);
  end if;
  return new;
end;
$$;
