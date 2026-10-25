import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseFalso } from "@/pruebas/supabaseFalso";

const sesion = vi.hoisted(() => ({ cliente: null as unknown, rol: "encargado" }));
vi.mock("@/lib/sesion", () => ({
  requerirSesion: async () => ({ supabase: sesion.cliente, perfil: { id: "u", nombre: "Prueba", rol: sesion.rol, activo: true } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
);
vi.mock("next/navigation", () => ({ redirect }));

const { crearLote, cancelarRecibo } = await import("./acciones");

const A = "6f1c2c9e-8a37-4d4b-9a51-0c5a3f3b9d10";
const B = "0b7e5a52-3f7c-4a0e-8d3f-9d1f4b8b2c11";
const fila = (trabajadorId: string) => ({ trabajadorId, periodoInicio: "2026-10-24", periodoFin: "2026-10-24", fechaPago: "2026-10-24", cantidad: 1 });
const formulario = (datos: unknown) => {
  const f = new FormData();
  f.set("datos", typeof datos === "string" ? datos : JSON.stringify(datos));
  return f;
};

describe("crearLote", () => {
  beforeEach(() => {
    redirect.mockClear();
    sesion.rol = "encargado";
  });

  it("crea un recibo por trabajador con crear_recibo y abre la impresión con todos", async () => {
    let n = 0;
    const { cliente, llamadas } = supabaseFalso((l) => (l.rpc === "crear_recibo" ? { data: { id: `r${++n}` }, error: null } : undefined));
    sesion.cliente = cliente;
    await expect(crearLote({ error: null, creados: 0 }, formulario([fila(A), fila(B)]))).rejects.toMatchObject({ url: "/imprimir?ids=r1,r2" });
    expect(llamadas.map((l) => (l.args as { p_trabajador_id: string }).p_trabajador_id)).toEqual([A, B]);
  });

  it("si uno falla dice cuántos se hicieron y traduce el error", async () => {
    let n = 0;
    const { cliente } = supabaseFalso((l) =>
      l.rpc === "crear_recibo"
        ? ++n === 1
          ? { data: { id: "r1" }, error: null }
          : { data: null, error: { code: "P0001", message: "Trabajador no encontrado o dado de baja" } }
        : undefined,
    );
    sesion.cliente = cliente;
    const r = await crearLote({ error: null, creados: 0 }, formulario([fila(A), fila(B)]));
    expect(r).toEqual({ error: "Trabajador no encontrado o dado de baja", creados: 1 });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("rechaza datos mal formados sin llamar a la base de datos", async () => {
    const { cliente, llamadas } = supabaseFalso();
    sesion.cliente = cliente;
    expect((await crearLote({ error: null, creados: 0 }, formulario("{no es json"))).error).toMatch(/No se pudieron leer/);
    expect((await crearLote({ error: null, creados: 0 }, formulario([]))).error).toMatch(/al menos/);
    expect((await crearLote({ error: null, creados: 0 }, formulario([{ ...fila(A), trabajadorId: "abc" }]))).error).toMatch(/Revisa/);
    expect((await crearLote({ error: null, creados: 0 }, formulario([{ ...fila(A), cantidad: 0 }]))).error).toMatch(/Revisa/);
    expect(llamadas).toHaveLength(0);
  });
});

describe("cancelarRecibo", () => {
  it("un encargado no puede cancelar", async () => {
    const { cliente, llamadas } = supabaseFalso();
    sesion.cliente = cliente;
    sesion.rol = "encargado";
    const f = new FormData();
    f.set("id", A);
    f.set("motivo", "error");
    expect((await cancelarRecibo({ error: null }, f)).error).toMatch(/Solo el administrador/);
    expect(llamadas).toHaveLength(0);
  });
});
