import { Client } from "pg";

export const URL_BD = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

// Cuentas y trabajadores ficticios de supabase/seed.sql.
export const ADMIN = "00000000-0000-4000-8000-0000000000a1";
export const ENCARGADA = "00000000-0000-4000-8000-0000000000e1";
export const INACTIVO = "00000000-0000-4000-8000-0000000000b1";
export const SIN_PERFIL = "00000000-0000-4000-8000-0000000000c1";
export const ROSA = "10000000-0000-4000-8000-000000000001"; // semana fija $2,184, lun-sáb
export const BETO = "10000000-0000-4000-8000-000000000002"; // por día $350 + $30 pasaje

export type Bd = Client & {
  /** Corre lo que sigue como ese usuario (rol authenticated con su JWT), o como anon con null. */
  como(usuario: string | null): Promise<void>;
  /** Vuelve a ser postgres (dueño), para preparar datos. */
  dueno(): Promise<void>;
};

export async function conectar(): Promise<Bd> {
  const c = new Client({ connectionString: URL_BD }) as Bd;
  await c.connect();
  c.como = async (usuario) => {
    await c.query("reset role");
    if (usuario) {
      await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: usuario, role: "authenticated" })]);
      await c.query("set local role authenticated");
    } else {
      await c.query("select set_config('request.jwt.claims', '', true)");
      await c.query("set local role anon");
    }
  };
  c.dueno = async () => {
    await c.query("reset role");
    await c.query("select set_config('request.jwt.claims', '', true)");
  };
  return c;
}

/** Espera un error de Postgres y devuelve su mensaje. */
export async function error(p: Promise<unknown>): Promise<{ message: string; code?: string }> {
  try {
    await p;
  } catch (e) {
    return e as { message: string; code?: string };
  }
  throw new Error("Se esperaba un error y no hubo");
}
