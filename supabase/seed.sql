-- Datos FICTICIOS para el Supabase local (npx supabase start / db reset).
-- Nunca se corren en producción: el SQL Editor de producción solo recibe las
-- migraciones. Las cuentas y contraseñas son de prueba.
--
--   admin@ejemplo.test       / prueba-admin-123      (administrador)
--   encargado@ejemplo.test   / prueba-encargado-123  (encargado)
--   inactivo@ejemplo.test    / prueba-inactivo-123   (perfil desactivado)
--   sinperfil@ejemplo.test   / prueba-sinperfil-123  (cuenta sin perfil)

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, email_change, email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt(u.clave, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  from (values
    ('00000000-0000-4000-8000-0000000000a1'::uuid, 'admin@ejemplo.test', 'prueba-admin-123'),
    ('00000000-0000-4000-8000-0000000000e1'::uuid, 'encargado@ejemplo.test', 'prueba-encargado-123'),
    ('00000000-0000-4000-8000-0000000000b1'::uuid, 'inactivo@ejemplo.test', 'prueba-inactivo-123'),
    ('00000000-0000-4000-8000-0000000000c1'::uuid, 'sinperfil@ejemplo.test', 'prueba-sinperfil-123')
  ) as u (id, email, clave);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
  from auth.users
 where email like '%@ejemplo.test';

insert into perfiles (id, nombre, rol, activo) values
  ('00000000-0000-4000-8000-0000000000a1', 'Admin Prueba', 'admin', true),
  ('00000000-0000-4000-8000-0000000000e1', 'Encargada Prueba', 'encargado', true),
  ('00000000-0000-4000-8000-0000000000b1', 'Inactivo Prueba', 'encargado', false);

insert into trabajadores (id, nombre, tipo, actividad, forma_pago, tarifa, pasaje, pago_cuando, pago_dia_semana, dias_trabajo, horas_dia, creado_en) values
  ('10000000-0000-4000-8000-000000000001', 'Rosa Prueba', 'informal_semana', 'Cocina', 'semana', 2184, 0, 'dia_semana', 6, '{1,2,3,4,5,6}', 8, now() - interval '60 days'),
  ('10000000-0000-4000-8000-000000000002', 'Beto Ejemplo', 'informal_turno', 'Meseros', 'dia', 350, 30, 'cada_dia', null, '{1,2,3,4,5,6}', 8, now() - interval '60 days'),
  ('10000000-0000-4000-8000-000000000003', 'Lupe Demo', 'informal_turno', 'Aseo', 'dia', 300, 0, 'cada_dia', null, '{5,6,7}', 6, now()),
  ('10000000-0000-4000-8000-000000000004', 'Toño Sin Días', 'informal_turno', 'Apoyo', 'dia', 280, 0, 'cada_dia', null, '{}', null, now()),
  ('10000000-0000-4000-8000-000000000005', 'Memo Tareas', 'informal_tarea', 'Mantenimiento', 'tarea', 500, 0, 'al_terminar', null, '{2,4}', null, now() - interval '30 days');
