-- Corregir una falta pendiente (tipo, medio día y motivo) sin borrarla.
--
-- Solo mientras no esté en un recibo (recibo_id is null), igual que borrarla.
-- El trabajador y la fecha no se cambian: para eso se quita y se anota otra,
-- así se vuelve a revisar que ese día no esté ya pagado.
--
-- No cambia filas existentes: agrega una política y un trigger.
--
-- Para revertir:
--   drop trigger if exists faltas_proteger on faltas;
--   drop function if exists faltas_proteger();
--   drop policy if exists faltas_editar on faltas;

create policy faltas_editar on faltas for update to authenticated
  using (es_usuario_activo() and recibo_id is null)
  with check (es_usuario_activo() and recibo_id is null);

-- Desde la aplicación (rol authenticated) solo cambian tipo, fracción y nota.
-- Las funciones security definer (crear_recibo, cancelar_recibo) sí ligan y
-- liberan faltas de un recibo.
create or replace function faltas_proteger() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.trabajador_id, new.fecha, new.creado_por, new.creado_en)
         is distinct from (old.trabajador_id, old.fecha, old.creado_por, old.creado_en) then
    raise exception 'De una falta solo se puede cambiar el tipo, el medio día y el motivo';
  end if;
  return new;
end;
$$;

create trigger faltas_proteger
before update on faltas
for each row execute function faltas_proteger();
