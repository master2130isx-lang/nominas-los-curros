import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { CABECERA_USUARIO } from "@/lib/supabase/cabecera";

const estado = vi.hoisted(() => ({ usuario: null as { id: string } | null, llamadas: 0 }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => {
        estado.llamadas++;
        return { data: { user: estado.usuario } };
      },
    },
  }),
}));

const { middleware } = await import("./middleware");
const REAL = "6f1c2c9e-8a37-4d4b-9a51-0c5a3f3b9d10";
const FALSO = "0b7e5a52-3f7c-4a0e-8d3f-9d1f4b8b2c11";

describe("middleware", () => {
  it("valida una vez y pasa el id real, aunque el navegador mande la cabecera", async () => {
    estado.usuario = { id: REAL };
    estado.llamadas = 0;
    const r = await middleware(new NextRequest("http://localhost/faltas", { headers: { [CABECERA_USUARIO]: FALSO } }));
    expect(estado.llamadas).toBe(1);
    expect(r.headers.get(`x-middleware-request-${CABECERA_USUARIO}`)).toBe(REAL);
  });

  it("sin sesión manda a /login y no deja pasar la cabecera falsa", async () => {
    estado.usuario = null;
    const r = await middleware(new NextRequest("http://localhost/recibos/x.png", { headers: { [CABECERA_USUARIO]: FALSO } }));
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toBe("http://localhost/login");
  });

  it("a quien ya tiene sesión lo saca de /login", async () => {
    estado.usuario = { id: REAL };
    const r = await middleware(new NextRequest("http://localhost/login"));
    expect(r.headers.get("location")).toBe("http://localhost/");
  });
});
