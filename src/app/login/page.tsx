import { entrar } from "./acciones";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <form action={entrar} className="caja relleno formulario" style={{ width: "100%", maxWidth: 380 }}>
        <div>
          <h1>Los Curros</h1>
          <p className="sub" style={{ margin: "4px 0 0", color: "var(--tenue)" }}>
            Nóminas y recibos
          </p>
        </div>
        {error && <p className="alerta">El correo o la contraseña no son correctos.</p>}
        <div className="campo">
          <label htmlFor="correo">Correo</label>
          <input id="correo" name="correo" type="email" autoComplete="email" required />
        </div>
        <div className="campo">
          <label htmlFor="contrasena">Contraseña</label>
          <input id="contrasena" name="contrasena" type="password" autoComplete="current-password" required />
        </div>
        <button type="submit" className="boton primario">
          Entrar
        </button>
      </form>
    </main>
  );
}
