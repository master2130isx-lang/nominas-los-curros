# Nóminas Los Curros

Plataforma privada para registrar pagos y generar recibos de nómina del restaurante Los Curros (Tamuín, S.L.P.).

Hecha con Next.js (en Vercel) y Supabase (base de datos, cuentas y fotos de recibos firmados).

## Qué hace

- **Pagos del día** (la pantalla de inicio): a quién le toca cobrar hoy, ayer o mañana según su día de pago
  y los días que trabaja. Se palomean y se hacen e imprimen todos los recibos del día de una vez. También
  avisa de pagos que se quedaron pendientes en días anteriores.
- **Semana** (lunes a domingo): quién ya cobró, quién falta, total pagado y recibos sin foto firmada,
  agrupado por día de pago.
- **Faltas**: se marcan desde Pagos del día ("¿Quién faltó?") o desde Faltas: sin aviso, permiso sin goce o
  justificada con pago, de día completo o medio día. En los de semana fija entran solas al recibo: las que se
  descuentan restan el sueldo semanal ÷ días pactados (con 6 días y 1 de descanso es el salario diario, semanal ÷ 7,
  más la parte proporcional del descanso, LFT art. 69 y 72) y las justificadas salen como nota de $0. Avisa cuando
  alguien junta 3 faltas sin aviso en 30 días (art. 47 fr. X).
- **Jornada y salario mínimo**: en cada trabajador se anotan las horas por día pactadas; la plataforma muestra su
  salario diario, cuánto descuenta una falta y cómo queda su pago por hora frente al mínimo proporcional.
- **Constancia de condiciones de trabajo** (art. 24 y 25): se imprime desde el trabajador, se firma una vez y se
  sube la foto.
- **Nuevo recibo**: escoges al trabajador, marcas los días o escribes horas, turnos o tareas, agregas extras o
  descuentos con su motivo y anotas cuánto abona a sus préstamos. El recibo se arma en pantalla mientras capturas.
- **Folio consecutivo**: lo asigna la base de datos al guardar; no se repite ni se salta.
- **Recibos que no se editan**: un recibo guardado no se cambia ni se borra. Si hay un error, el administrador
  lo cancela con un motivo y se hace uno nuevo; sus abonos regresan al saldo y sus faltas vuelven a quedar pendientes.
- **Impresión**: hoja carta con original arriba y copia para el trabajador abajo, o dos recibos por hoja sin
  copia. Se pueden imprimir todos los de la semana de una vez. Desde la segunda impresión sale marcado como
  REIMPRESIÓN.
- **Firma en papel**: el trabajador firma (o pone su huella) y se sube una foto o escaneo del recibo firmado.
  Las fotos se guardan en un espacio privado.
- **Préstamos y adelantos** con saldo: en cada recibo se escribe lo que el trabajador quiere abonar (puede ser
  $0), se aplica primero al más viejo y el recibo dice cuánto resta. En Préstamos se ve el historial de abonos.
- **Trabajadores**.
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

   Cada vez que se agrega un archivo nuevo en `supabase/migrations`, hay que correrlo una vez en el
   SQL Editor (solo el nuevo, en orden de nombre).
3. En **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**. Así nadie puede
   crearse una cuenta por su cuenta.
4. En **Authentication → Users → Add user**, crea tu usuario y el de cada encargado (correo y contraseña,
   marcando *Auto Confirm User*).
5. Dales permiso en el **SQL Editor** (cambia los correos y nombres):

   ```sql
   insert into perfiles (id, nombre, rol)
   select id, 'Ismael', 'admin' from auth.users where email = 'tu-correo@ejemplo.com';

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
3. **Deploy**.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y llena los valores
npm run dev
```

Con Docker puedes levantar un Supabase local con `npx supabase start`, que aplica las migraciones de
`supabase/migrations`.

```bash
npm test        # cálculo de recibos, cantidades con letra y fechas
npm run lint    # revisión de tipos
```

El cálculo del recibo vive en dos lugares que deben dar lo mismo: `crear_recibo` en la base de datos (la que
guarda) y `src/lib/calculo.ts` (la vista previa en pantalla).
