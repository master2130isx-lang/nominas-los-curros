import Link from "next/link";
import { MenuNav } from "@/componentes/MenuNav";
import { requerirSesion } from "@/lib/sesion";
import { salir } from "../login/acciones";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { perfil } = await requerirSesion();
  return (
    <div className="app">
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <aside className="menu">
        <Link href="/" className="marca" style={{ color: "inherit", textDecoration: "none" }}>
          <span className="sello-marca" aria-hidden="true">
            LC
          </span>
          <span className="nombre-marca">
            <strong>Los Curros</strong>
            <span className="lema">Nóminas y recibos</span>
          </span>
        </Link>
        <MenuNav />
        <div className="usuario">
          <span>
            <strong>{perfil.nombre}</strong> · {perfil.rol === "admin" ? "Administrador" : "Encargado"}
          </span>
          <form action={salir}>
            <button type="submit" className="boton chico">
              Salir
            </button>
          </form>
        </div>
      </aside>
      <main className="contenido" id="contenido" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
