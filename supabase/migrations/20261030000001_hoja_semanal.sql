-- Hoja semanal de los que cobran cada día: un solo papel firmado por semana.
--
-- Los recibos diarios se siguen haciendo (folio y registro de cada pago), pero
-- la firma es una sola al final de la semana. Al subir la foto de la hoja
-- semanal firmada, los recibos de esa semana de quienes cobran cada día quedan
-- como firmados con esa foto.
--
-- No cambia filas existentes ni tablas: solo agrega una función.
--
-- Para revertir:
--   drop function if exists marcar_hoja_semanal(date, text);

create or replace function marcar_hoja_semanal(p_inicio date, p_foto_path text) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
begin
  if not es_usuario_activo() then
    raise exception 'No tienes acceso';
  end if;
  if extract(isodow from p_inicio) <> 1 then
    raise exception 'La semana debe empezar en lunes';
  end if;
  if p_foto_path is null or p_foto_path not like 'semanas/' || p_inicio::text || '/%' then
    raise exception 'Foto no válida';
  end if;
  update recibos r
     set estado = 'firmado', foto_path = p_foto_path
    from trabajadores t
   where t.id = r.trabajador_id
     and t.pago_cuando = 'cada_dia'
     and r.estado = 'sin_firma'
     and r.fecha_pago between p_inicio and p_inicio + 6;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function marcar_hoja_semanal from public, anon;
grant execute on function marcar_hoja_semanal to authenticated;
