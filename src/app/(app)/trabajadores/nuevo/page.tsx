import Link from "next/link";
import { FormularioTrabajador } from "../FormularioTrabajador";

export default function NuevoTrabajador() {
  return (
    <>
      <div className="encabezado">
        <h1>Agregar trabajador</h1>
        <Link className="boton chico" href="/trabajadores">
          Volver
        </Link>
      </div>
      <FormularioTrabajador />
    </>
  );
}
