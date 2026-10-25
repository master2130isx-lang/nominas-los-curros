-- Una falta no se puede anotar en un día que ya está pagado en un recibo vigente.
--
-- crear_recibo solo toma las faltas pendientes cuya fecha cae dentro del periodo
-- del recibo NUEVO. Una falta anotada después en un periodo ya pagado se quedaba
-- pendiente para siempre y nunca se descontaba. La pantalla ya avisa con el folio
-- y un enlace; este trigger lo garantiza en la base de datos.
--
-- No cambia filas existentes: solo revisa las faltas nuevas (insert).
--
-- Para revertir:
--   drop trigger if exists faltas_revisar_recibo on faltas;
--   drop function if exists faltas_revisar_recibo();

create or replace function faltas_revisar_recibo() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_folio int;
begin
  -- A quien no tiene perfil activo no se le dice nada: RLS rechaza la fila después.
  if not es_usuario_activo() then
    return new;
  end if;
  select folio into v_folio
    from recibos
   where trabajador_id = new.trabajador_id
     and estado <> 'cancelado'
     and new.fecha between periodo_inicio and periodo_fin
   order by folio
   limit 1;
  if found then
    raise exception 'Ese día ya está pagado en el recibo folio %. Para anotar la falta hay que cancelar ese recibo y hacer uno nuevo.',
      lpad(v_folio::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger faltas_revisar_recibo
before insert on faltas
for each row execute function faltas_revisar_recibo();
