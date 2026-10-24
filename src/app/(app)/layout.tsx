import { MenuNav } from "@/componentes/MenuNav";
import { requerirSesion } from "@/lib/sesion";
import { salir } from "../login/acciones";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { perfil } = await requerirSesion();
  return (
    <div className="app">
      <aside className="menu">
        <div className="marca">
          <strong>Los Curros</strong>
          <span>Nóminas y recibos</span>
        </div>
        <MenuNav />
        <div className="usuario">
          <span>
            {perfil.nombre} · {perfil.rol === "admin" ? "Administrador" : "Encargado"}
          </span>
          <form action={salir}>
            <button type="submit" className="boton chico">
              Salir
            </button>
          </form>
        </div>
      </aside>
      <main className="contenido">{children}</main>
    </div>
  );
}
