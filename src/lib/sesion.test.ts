import { beforeEach, describe, expect, it, vi } from "vitest";
import { CABECERA_USUARIO } from "./supabase/cabecera";

const estado = vi.hoisted(() => ({ cabecera: null as string | null, getUser: vi.fn(), perfil: null as unknown }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(estado.cabecera ? { [CABECERA_USUARIO]: estado.cabecera } : {}) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));
vi.mock("./supabase/server", () => ({
  crearClienteServidor: async () => ({
    auth: { getUser: estado.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: estado.perfil, error: null }) }) }) }),
  }),
}));

const { requerirSesion } = await import("./sesion");
const ID = "6f1c2c9e-8a37-4d4b-9a51-0c5a3f3b9d10";

describe("requerirSesion", () => {
  beforeEach(() => {
    estado.getUser.mockReset();
    estado.getUser.mockResolvedValue({ data: { user: { id: ID } } });
    estado.perfil = { id: ID, nombre: "Prueba", rol: "encargado", activo: true };
  });

  it("usa el usuario que ya validó el middleware: cero llamadas extra a getUser()", async () => {
    estado.cabecera = ID;
    const r = await requerirSesion();
    expect(r.usuarioId).toBe(ID);
    expect(estado.getUser).not.toHaveBeenCalled();
  });

  it("sin la cabecera (o con una inválida) valida con getUser() una vez", async () => {
    estado.cabecera = null;
    await requerirSesion();
    estado.cabecera = "no-es-uuid";
    await requerirSesion();
    expect(estado.getUser).toHaveBeenCalledTimes(2);
  });

  it("manda a /sin-acceso a quien no tiene perfil activo y a /login a quien no tiene sesión", async () => {
    estado.cabecera = ID;
    estado.perfil = { id: ID, nombre: "Prueba", rol: "encargado", activo: false };
    await expect(requerirSesion()).rejects.toMatchObject({ url: "/sin-acceso" });
    estado.cabecera = null;
    estado.getUser.mockResolvedValue({ data: { user: null } });
    await expect(requerirSesion()).rejects.toMatchObject({ url: "/login" });
  });
});
