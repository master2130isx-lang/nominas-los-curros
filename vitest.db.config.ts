import { defineConfig } from "vitest/config";
import path from "node:path";

// Pruebas de RLS, triggers y funciones contra el Postgres del Supabase local
// (npx supabase start). Cada prueba corre en una transacción que se deshace.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["supabase/pruebas/**/*.test.ts"], fileParallelism: false, testTimeout: 20000 },
});
