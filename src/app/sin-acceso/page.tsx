import { BotonEnviar } from "@/componentes/BotonEnviar";
import { salir } from "../login/acciones";

export default function SinAcceso() {
  return (
    <main className="entrada">
      <div className="caja relleno formulario">
        <div className="marca-entrada">
          <span className="sello-marca" aria-hidden="true">
            LC
          </span>
          <div>
            <h1>Sin acceso</h1>
            <p>Nóminas Los Curros</p>
          </div>
        </div>
        <p style={{ margin: 0 }}>
          Tu cuenta existe, pero todavía no tiene permiso para usar la plataforma. Pídele al administrador que te dé de
          alta.
        </p>
        <form action={salir}>
          <BotonEnviar className="boton" ocupado="Saliendo…">
            Salir
          </BotonEnviar>
        </form>
      </div>
    </main>
  );
}
