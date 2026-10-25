# Nóminas Los Curros

Plataforma privada para registrar pagos y generar recibos de nómina del restaurante Los Curros (Tamuín, S.L.P.).

Hecha con Next.js (en Vercel) y Supabase (base de datos, cuentas y fotos de recibos firmados).

## Qué hace

- **Fecha de inicio**: la plataforma empezó el 24 de octubre de 2026. Ninguna pantalla muestra ni deja capturar
  días o semanas anteriores (se puede mover con la variable `FECHA_INICIO`, ver abajo).
- **Guía** en cada apartado del menú: un botón con los pasos numerados para los encargados.
- **Pagos del día** (la pantalla de inicio): a quién le toca cobrar hoy, ayer o mañana según su día de pago
  y los días que trabaja. Se palomean y se hacen e imprimen todos los recibos del día de una vez. También
  avisa de pagos que se quedaron pendientes en días anteriores.
- **Semana** (lunes a domingo): quién ya cobró, quién falta, total pagado y recibos sin foto firmada,
  agrupado por día de pago.
- **Asistencia de la semana**: cuadrícula de trabajadores × días. Un toque en un día marca la falta (o medio día),
  la corrige o la quita. Aparecen todos, aunque no tengan días de trabajo marcados. Los días que ya están en un recibo muestran el folio y no se marcan.
- **Faltas**: se marcan desde Pagos del día ("¿Quién faltó?"), desde Asistencia o desde Faltas: sin aviso, permiso sin goce o
  justificada con pago, de día completo o medio día. En los de semana fija entran solas al recibo: las que se
  descuentan restan el sueldo semanal ÷ días pactados (con 6 días y 1 de descanso, la falta sin aviso es el salario
  diario, semanal ÷ 7, más la parte proporcional del descanso, LFT art. 69 y 72; el permiso sin goce es solo el día) y las justificadas salen como nota de $0. Avisa cuando
  alguien junta 3 faltas sin aviso en 30 días (art. 47 fr. X). Una falta pendiente se puede corregir (tipo, medio día,
  motivo) sin borrarla. No se puede anotar una falta en un día que ya está pagado en un recibo vigente: la plataforma
  avisa con el folio y un enlace al recibo.
- **Jornada y salario mínimo**: en cada trabajador se anotan las horas por día pactadas; la plataforma muestra su
  salario diario, cuánto descuenta una falta y cómo queda su pago por hora frente al mínimo proporcional.
- **Constancia de condiciones de trabajo** (art. 24 y 25): se imprime desde el trabajador, se firma una vez y se
  sube la foto.
- **Nuevo recibo**: escoges al trabajador, marcas los días o escribes horas, turnos o tareas, agregas extras o
  descuentos con su motivo y anotas cuánto abona a sus préstamos. El recibo se arma en pantalla mientras capturas.
- **Folio consecutivo**: lo asigna la base de datos al guardar; no se repite ni se salta.
- **Recibos que no se editan**: un recibo guardado no se cambia ni se borra. Si hay un error, el administrador
  lo cancela con un motivo y se hace uno nuevo; sus abonos regresan al saldo y sus faltas vuelven a quedar pendientes.
- **Comprobante de pago** en hoja carta: datos del patrón y del trabajador, periodo, percepciones y deducciones,
  neto con letra, condiciones de trabajo (lugar, horario, alimentación), leyenda de conformidad, firma del trabajador
  y del patrón. La comida sin costo sale como prestación en especie; si el trabajador gana menos que el mínimo
  proporcional, una nota la registra como parte de su compensación.
- **Impresión**: una hoja carta para el original y otra para la copia del trabajador (o solo el original). Se pueden imprimir todos los de la semana de una vez. Desde la segunda impresión sale marcado como
  REIMPRESIÓN.
- **Hoja semanal para firmar** (Semana → “Hoja semanal para firmar”): los que cobran cada día no firman a diario;
  una hoja carta horizontal lista a todos con lo que se les pagó cada día, el total y un solo espacio de firma. Al
  subir la foto de la hoja firmada, sus recibos de esa semana quedan como firmados.
- **Firma en papel**: el trabajador firma (o pone su huella) y se sube una foto o escaneo del recibo firmado.
  Las fotos se guardan en un espacio privado.
- **Préstamos y adelantos** con saldo: en cada recibo se escribe lo que el trabajador quiere abonar (puede ser
  $0), se aplica primero al más viejo y el recibo dice cuánto resta. En Préstamos se ve el historial de abonos.
- **Trabajadores** con expediente laboral: datos personales (nacimiento, CURP, RFC, NSS, domicilio, teléfono y
  contacto de emergencia), puesto, fecha de ingreso, tipo de contrato, salario diario registrado, forma de pago,
  tarifa, pasaje, alimentación y documentos adjuntos (INE, contrato…). Solo el administrador cambia la tarifa o da de baja; cada cambio de tarifa, pasaje, forma de
  pago o baja queda en un historial de solo lectura (quién, cuándo, antes y después).
- Solo entran las personas que el administrador da de alta (rol administrador o encargado). Solo el
  administrador cancela recibos.

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (región más cercana: `us-east` o `us-west`).
2. En **SQL Editor**, corre en orden el contenido de:
   - `supabase/migrations/20261024000000_inicial.sql`
   - `supabase/migrations/20261024000001_almacenamiento.sql`
   - `supabase/migrations/20261025000000_dia_de_pago.sql`
   - `supabase/migrations/20261026000000_faltas.sql`
   - `supabase/migrations/20261027000000_abonos.sql`
   - `supabase/migrations/20261028000000_permiso_sin_goce.sql`
   - `supabase/migrations/20261029000000_faltas_en_recibo.sql`
   - `supabase/migrations/20261029000001_editar_faltas.sql`
   - `supabase/migrations/20261029000002_bitacora_trabajadores.sql`
   - `supabase/migrations/20261030000000_expediente.sql`
   - `supabase/migrations/20261030000001_hoja_semanal.sql`

   Cada vez que se agrega un archivo nuevo en `supabase/migrations`, hay que correrlo una vez en el
   SQL Editor (solo el nuevo, en orden de nombre).
3. En **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**. Así nadie puede
   crearse una cuenta por su cuenta.
4. En **Authentication → Users → Add user**, crea tu usuario y el de cada encargado (correo y contraseña,
   marcando *Auto Confirm User*).
5. Dales permiso en el **SQL Editor** (cambia los correos y nombres):

   ```sql
   insert into perfiles (id, nombre, rol)
   select id, 'Tu nombre', 'admin' from auth.users where email = 'tu-correo@ejemplo.com';

   insert into perfiles (id, nombre, rol)
   select id, 'Nombre del encargado', 'encargado' from auth.users where email = 'encargado@ejemplo.com';
   ```

   Para quitarle el acceso a alguien: `update perfiles set activo = false where nombre = '...';`

6. Agrega a los trabajadores desde la plataforma (Trabajadores → Agregar) o con un script SQL.

### 2. Vercel

1. En [vercel.com](https://vercel.com), **Add New → Project** e importa este repositorio.
2. En **Environment Variables** agrega (los valores están en Supabase, **Project Settings → API**):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_DOMICILIO_NEGOCIO` (opcional): el domicilio que sale en los recibos, por ejemplo
     `Calle Hidalgo 123, Centro, Tamuín, S.L.P.`
   - `NEXT_PUBLIC_PATRON_NOMBRE`, `NEXT_PUBLIC_PATRON_RFC`, `NEXT_PUBLIC_REGISTRO_PATRONAL` (opcionales): datos del
     patrón en recibos y hojas semanales. Sin RFC o registro, esas líneas no se imprimen.
   - `FECHA_INICIO` (opcional, AAAA-MM-DD): primer día que muestra la plataforma. Si no se pone, es el 2026-10-24.
3. **Deploy**.

## Migraciones nuevas: cómo probarlas y revertirlas

Las tres migraciones de octubre 29 no modifican filas existentes: agregan un trigger que impide anotar faltas en
días ya pagados, una política para corregir faltas pendientes y la bitácora de trabajadores con su trigger de
permisos. Cada archivo trae al inicio el SQL para revertirlo.

Antes de correrlas en producción:

1. Crea un proyecto **de prueba** en Supabase (gratis) y corre ahí todas las migraciones en orden.
2. Opcional: corre `supabase/seed.sql` en ese proyecto de prueba para tener cuentas y trabajadores ficticios.
3. Apunta tu `.env.local` a ese proyecto y recorre los flujos (o corre las pruebas, ver abajo).
4. Si todo está bien, corre en el SQL Editor de producción **solo** los archivos nuevos, en orden. Nunca
   corras `seed.sql` en producción.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y llena los valores
npm run dev                  # http://localhost:3000
```

Para no tocar ningún proyecto real, levanta un Supabase local (necesita Docker; en Mac sirve
`brew install colima docker && colima start`):

```bash
npx supabase start   # aplica supabase/migrations y supabase/seed.sql (datos ficticios)
```

y en `.env.local` usa la `API_URL` y la `ANON_KEY` que imprime (`npx supabase status`). Cuentas de prueba:
`admin@ejemplo.test` / `prueba-admin-123` y `encargado@ejemplo.test` / `prueba-encargado-123`.

## Pruebas

```bash
npm test          # lógica (cálculo, programa de pagos, errores, uuid) y Server Actions con cliente falso
npm run lint      # revisión de tipos
npm run test:db   # RLS, triggers, RPC y paridad del cálculo SQL = pantalla (Supabase local)
npm run build && npm run e2e   # flujos completos en celular (375 px) con Playwright (Supabase local)
```

CI corre todo esto en cada Pull Request, con un Supabase local efímero.

El cálculo del recibo vive en dos lugares que deben dar lo mismo: `crear_recibo` en la base de datos (la que
guarda) y `src/lib/calculo.ts` (la vista previa en pantalla). `npm run test:db` compara ambos.
