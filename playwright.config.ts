import { defineConfig, devices } from "@playwright/test";
import { hoy, sumarDias } from "./src/lib/fechas";

// Pruebas de punta a punta en celular (375 px) contra el Supabase local con los
// datos ficticios de supabase/seed.sql. Ver README: "Pruebas".
const PUERTO = Number(process.env.PUERTO_E2E ?? 3100);
// Las pruebas usan semanas pasadas: el inicio de la plataforma se mueve 60 días atrás.
export const INICIO_E2E = process.env.FECHA_INICIO ?? sumarDias(hoy(), -60);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}`,
    ...devices["iPhone 13 Mini"],
    viewport: { width: 375, height: 812 },
    browserName: "chromium",
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run start -- -p ${PUERTO}`,
    env: { FECHA_INICIO: INICIO_E2E },
    url: `http://127.0.0.1:${PUERTO}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
