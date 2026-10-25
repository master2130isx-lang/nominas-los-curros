import { describe, expect, it } from "vitest";
import { traducirError, traducirErrorSubida } from "./errores";
import { esUuid, leerFiltroTrabajador } from "./validacion";

describe("traducirError", () => {
  it("usa el nombre de la restricción para dar un mensaje claro", () => {
    expect(
      traducirError({ code: "23505", message: 'duplicate key value violates unique constraint "faltas_trabajador_id_fecha_key"' }),
    ).toBe("Ya hay una falta anotada ese día para este trabajador.");
    expect(traducirError({ code: "23514", message: 'new row violates check constraint "trabajadores_tarifa_check"' })).toBe(
      "La tarifa no puede ser negativa.",
    );
  });

  it("deja pasar los mensajes de nuestras funciones SQL (raise exception)", () => {
    expect(traducirError({ code: "P0001", message: "Solo el administrador puede cancelar recibos" })).toBe(
      "Solo el administrador puede cancelar recibos",
    );
  });

  it("nunca devuelve el mensaje técnico de Postgres", () => {
    const crudo = 'new row violates row-level security policy for table "faltas"';
    expect(traducirError({ code: "42501", message: crudo })).toBe("No tienes permiso para hacer este cambio.");
    expect(traducirError({ code: "XX000", message: "internal error at tuple 7" })).not.toContain("tuple");
    expect(traducirError({ code: "22P02", message: 'invalid input syntax for type uuid: "abc"' })).toMatch(/no es válido/);
    expect(traducirError({ message: "TypeError: fetch failed" })).toMatch(/conexión/);
    expect(traducirError(null, "No se pudo guardar el recibo.")).toBe("No se pudo guardar el recibo.");
  });

  it("traduce los errores al subir fotos", () => {
    expect(traducirErrorSubida("The object exceeded the maximum allowed size")).toMatch(/10 MB/);
    expect(traducirErrorSubida("mime type text/plain is not supported")).toMatch(/tipo de archivo/);
    expect(traducirErrorSubida("new row violates row-level security policy")).toMatch(/permiso/);
    expect(traducirErrorSubida("weird")).toBe("No se pudo subir la foto. Intenta de nuevo.");
  });
});

describe("validación de uuid", () => {
  it("acepta uuid y rechaza lo demás", () => {
    expect(esUuid("6f1c2c9e-8a37-4d4b-9a51-0c5a3f3b9d10")).toBe(true);
    expect(esUuid("6F1C2C9E-8A37-4D4B-9A51-0C5A3F3B9D10")).toBe(true);
    expect(esUuid("abc")).toBe(false);
    expect(esUuid("6f1c2c9e-8a37-4d4b-9a51-0c5a3f3b9d1")).toBe(false);
    expect(esUuid("------------------------------------")).toBe(false);
    expect(esUuid(undefined)).toBe(false);
    expect(esUuid(123)).toBe(false);
  });

  it("distingue filtro vacío, válido e inválido", () => {
    expect(leerFiltroTrabajador(undefined)).toEqual({ invalido: false });
    expect(leerFiltroTrabajador("abc")).toEqual({ invalido: true });
    expect(leerFiltroTrabajador("6f1c2c9e-8a37-4d4b-9a51-0c5a3f3b9d10")).toEqual({ id: "6f1c2c9e-8a37-4d4b-9a51-0c5a3f3b9d10", invalido: false });
  });
});
