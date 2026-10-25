import { expect, test } from "@playwright/test";
import { entrar } from "./ayuda";

test.describe("Entrada", () => {
  test("sin sesión manda a /login y con datos malos avisa", async ({ page }) => {
    await page.goto("/faltas");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Correo").fill("encargado@ejemplo.test");
    await page.getByLabel("Contraseña").fill("mala");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".alerta[role=alert]")).toContainText("no son correctos");
  });

  test("una cuenta sin perfil o con perfil inactivo ve /sin-acceso", async ({ page }) => {
    await entrar(page, "sinperfil@ejemplo.test", "prueba-sinperfil-123");
    await expect(page).toHaveURL(/\/sin-acceso$/);
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await entrar(page, "inactivo@ejemplo.test", "prueba-inactivo-123");
    await expect(page).toHaveURL(/\/sin-acceso$/);
  });

  test("con sesión entra a Pagos del día y el menú lleva a Asistencia en un toque", async ({ page }) => {
    await entrar(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("navigation", { name: "Menú principal" }).getByRole("link", { name: "Asistencia" }).click();
    await expect(page).toHaveURL(/\/asistencia$/);
    await expect(page.getByRole("heading", { level: 1, name: "Asistencia de la semana" })).toBeVisible();
  });
});
