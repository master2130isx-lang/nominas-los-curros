import { BotonEnviar } from "@/componentes/BotonEnviar";
import { entrar } from "./acciones";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="entrada">
      <form action={entrar} className="caja relleno formulario">
        <div className="marca-entrada">
          <span className="sello-marca" aria-hidden="true">
            LC
          </span>
          <div>
            <h1>Los Curros</h1>
            <p>Nóminas y recibos</p>
          </div>
        </div>
        {error && (
          <p className="alerta" role="alert">
            El correo o la contraseña no son correctos.
          </p>
        )}
        <div className="campo">
          <label htmlFor="correo">Correo</label>
          <input id="correo" name="correo" type="email" autoComplete="email" required aria-invalid={error ? true : undefined} />
        </div>
        <div className="campo">
          <label htmlFor="contrasena">Contraseña</label>
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={error ? true : undefined}
          />
        </div>
        <BotonEnviar ocupado="Entrando…">Entrar</BotonEnviar>
      </form>
    </main>
  );
}
