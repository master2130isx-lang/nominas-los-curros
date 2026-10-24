-- Fotos de los recibos firmados en papel. El bucket es privado: solo los
-- usuarios con perfil activo pueden subir y ver fotos, y nadie las borra.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recibos-firmados', 'recibos-firmados', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy recibos_firmados_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'recibos-firmados' and public.es_usuario_activo());

create policy recibos_firmados_ver on storage.objects for select to authenticated
  using (bucket_id = 'recibos-firmados' and public.es_usuario_activo());
