import { expect, test } from "@playwright/test";
import { BETO, entrar, limpiar, objetivosTactiles, sinDesbordeHorizontal } from "./ayuda";

test.beforeEach(async () => {
  await limpiar();
});

test("Alta y edición de trabajador; la encargada no cambia la tarifa y el admin sí, con bitácora", async ({ page }) => {
  await entrar(page);
  await page.goto("/trabajadores/nuevo");
  const nombre = `Nuevo Ficticio ${Date.now()}`;
  await page.getByLabel("Nombre completo").fill(nombre);
  await page.getByLabel("Tarifa acordada (MXN)").fill("320");
  await page.getByText("Lun", { exact: true }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForURL(/\/trabajadores$/);
  await expect(page.getByRole("link", { name: nombre })).toBeVisible();

  await page.goto(`/trabajadores/${BETO}`);
  const tarifa = page.getByLabel("Tarifa acordada (MXN)");
  await expect(tarifa).toHaveAttribute("readonly", "");
  await expect(page.getByText("Solo el administrador cambia la tarifa.")).toBeVisible();
  await page.getByLabel(/Teléfono/).fill("4890001122");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForURL(/\/trabajadores$/);

  await page.getByRole("button", { name: "Salir" }).click();
  await entrar(page, "admin@ejemplo.test", "prueba-admin-123");
  await page.goto(`/trabajadores/${BETO}`);
  await page.getByLabel("Tarifa acordada (MXN)").fill("380");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForURL(/\/trabajadores$/);
  await page.goto(`/trabajadores/${BETO}`);
  const historial = page.locator(".bitacora");
  await expect(historial).toContainText("Tarifa");
  await expect(historial).toContainText("$350.00 → $380.00");
  await expect(historial).toContainText("Admin Prueba");
});

test("A 375 px Semana, Faltas y Recibos no se desbordan y los controles miden 44 px", async ({ page }) => {
  await entrar(page);
  for (const ruta of ["/semana", "/faltas", "/recibos", "/trabajadores", "/adelantos", "/asistencia", "/"]) {
    await page.goto(ruta);
    await sinDesbordeHorizontal(page);
    await objetivosTactiles(page);
  }
  await page.goto("/recibos?trabajador=abc");
  await expect(page.locator(".alerta[role=alert]")).toContainText("no es válido");
});
