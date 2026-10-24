import { salir } from "../login/acciones";

export default function SinAcceso() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div className="caja relleno formulario" style={{ maxWidth: 420 }}>
        <h1>Sin acceso</h1>
        <p style={{ margin: 0 }}>
          Tu cuenta existe, pero todavía no tiene permiso para usar la plataforma. Pídele al
          administrador que te dé de alta.
        </p>
        <form action={salir}>
          <button className="boton" type="submit">
            Salir
          </button>
        </form>
      </div>
    </main>
  );
}
