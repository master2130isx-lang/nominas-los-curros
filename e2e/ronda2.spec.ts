import { expect, test, type Page } from "@playwright/test";
import { INICIO_E2E } from "../playwright.config";
import { BETO, entrar, limpiar, ROSA, sql } from "./ayuda";
import { HOY, sumarDias } from "./fechas";
import { semanaDe } from "../src/lib/fechas";

const FOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const ENCARGADA = "00000000-0000-4000-8000-0000000000e1";
const reciboComo = (trabajador: string, inicio: string, fin: string, pago: string, cantidad = 1) =>
  sql(`begin;
    select set_config('request.jwt.claims', '{"sub":"${ENCARGADA}","role":"authenticated"}', true);
    select crear_recibo('${trabajador}', '${inicio}', '${fin}', '${pago}', ${cantidad});
    commit;`);

test.beforeEach(async () => {
  await limpiar();
  await sql(`delete from trabajador_documentos;
    update trabajadores set fecha_nacimiento = null, rfc = null, nss = null, domicilio = null, contacto_emergencia = null,
      telefono_emergencia = null, tipo_contrato = null, salario_diario = null, alimentacion = true, curp = null`);
});

test("Nada anterior al inicio: Pagos del día, Asistencia y Semana empiezan en la fecha de implementación", async ({ page }) => {
  await entrar(page);
  await page.goto(`/?fecha=${sumarDias(INICIO_E2E, -5)}`);
  await expect(page.locator(".navegacion-dia .deshabilitado")).toContainText("Anterior");
  await expect(page.getByLabel("Ir a una fecha")).toHaveValue(INICIO_E2E);
  await page.goto(`/asistencia?semana=${sumarDias(INICIO_E2E, -14)}`);
  const encabezados = await page.locator("table.asistencia thead th[scope=col] abbr").evaluateAll((els) => els.map((e) => e.getAttribute("title")));
  const lunes = semanaDe(INICIO_E2E).inicio;
  const esperados = Math.round((Date.parse(semanaDe(INICIO_E2E).fin) - Date.parse(INICIO_E2E)) / 86400000) + 1;
  expect(encabezados).toHaveLength(esperados);
  expect(lunes <= INICIO_E2E).toBe(true);
  await expect(page.locator(".navegacion-dia .deshabilitado")).toBeVisible();
  await page.goto(`/semana?semana=${sumarDias(INICIO_E2E, -30)}`);
  await expect(page.locator(".segmentado .deshabilitado")).toBeVisible();
});

test("Expediente completo: se guarda, se conserva al reabrir y acepta documentos", async ({ page }) => {
  await entrar(page, "admin@ejemplo.test", "prueba-admin-123");
  await page.goto(`/trabajadores/${BETO}`);
  const campos: [string, string][] = [
    ["Fecha de nacimiento", "1991-03-15"],
    ["CURP", "EEBB910315HSPJTT09"],
    ["RFC", "EEBB910315AB1"],
    ["NSS (IMSS)", "12345678901"],
    ["Domicilio", "Calle Hidalgo 12, Centro"],
    ["Teléfono", "4891112233"],
    ["Contacto de emergencia", "Hermana Ana"],
    ["Tel. de emergencia", "4894445566"],
    ["Puesto", "Mesero"],
    ["Fecha de ingreso", "2025-01-10"],
    ["Salario diario registrado (MXN)", "315.04"],
  ];
  for (const [etiqueta, valor] of campos) await page.getByLabel(etiqueta, { exact: true }).fill(valor);
  await page.getByLabel("Tipo de contrato").selectOption("indeterminado");
  await page.getByLabel("Se le da de comer sin costo").uncheck();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.waitForURL(/\/trabajadores$/);
  await page.goto(`/trabajadores/${BETO}`);
  for (const [etiqueta, valor] of campos) await expect(page.getByLabel(etiqueta, { exact: true })).toHaveValue(valor);
  await expect(page.getByLabel("Tipo de contrato")).toHaveValue("indeterminado");
  await expect(page.getByLabel("Se le da de comer sin costo")).not.toBeChecked();
  await expect(page.getByLabel("Forma de pago")).toBeVisible();
  await expect(page.getByLabel("Tarifa (MXN)")).toBeVisible();
  await expect(page.getByLabel("Pasaje (MXN)")).toBeVisible();

  await page.getByLabel("Qué documento es").fill("INE");
  await page.getByLabel("Foto o PDF").setInputFiles({ name: "ine.png", mimeType: "image/png", buffer: FOTO });
  await page.getByRole("button", { name: "Adjuntar documento" }).click();
  const docs = page.locator("section", { has: page.getByRole("heading", { name: "Documentos del expediente" }) });
  await expect(docs.getByText("INE", { exact: true })).toBeVisible();
  await expect(docs.getByRole("link", { name: "Ver" })).toHaveAttribute("href", /documentos/);
});

test("Formatos inválidos de CURP, RFC o NSS se avisan en español", async ({ page }) => {
  await entrar(page);
  await page.goto(`/trabajadores/${BETO}`);
  await page.getByLabel("NSS (IMSS)", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".alerta[role=alert]")).toContainText("11 dígitos");
});

for (const ancho of [1280, 375]) {
  test(`Forma de pago, tarifa y pasaje miden lo mismo y el texto no toca el borde (${ancho} px)`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await entrar(page, "admin@ejemplo.test", "prueba-admin-123");
    await page.goto(`/trabajadores/${BETO}`);
    await expect(page.getByLabel("Pasaje (MXN)", { exact: true })).toBeVisible();
    const cajas = await Promise.all(["Forma de pago", "Tarifa (MXN)", "Pasaje (MXN)"].map((e) => page.getByLabel(e, { exact: true }).boundingBox()));
    expect(new Set(cajas.map((c) => Math.round(c!.width))).size).toBe(1);
    expect(new Set(cajas.map((c) => Math.round(c!.height))).size).toBe(1);
    const rellenos = await page.locator(".uniforme input, .uniforme select").evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).offsetParent && (e as HTMLInputElement).type !== "checkbox" && (e as HTMLInputElement).type !== "file").map((e) => {
        const c = getComputedStyle(e);
        return Math.min(parseFloat(c.paddingLeft), parseFloat(c.paddingRight), (e.getBoundingClientRect().height - parseFloat(c.lineHeight === "normal" ? "20" : c.lineHeight)) / 2);
      }),
    );
    expect(Math.min(...rellenos)).toBeGreaterThanOrEqual(8);
  });
}

test("Cada apartado del menú tiene su guía con pasos numerados", async ({ page }) => {
  await entrar(page);
  for (const ruta of ["/", "/asistencia", "/semana", "/recibos/nuevo", "/recibos", "/faltas", "/trabajadores", "/adelantos"]) {
    await page.goto(ruta);
    const boton = page.getByRole("button", { name: "Guía" });
    await expect(boton, ruta).toBeVisible();
    await boton.click();
    const panel = page.locator("dialog[open]");
    await expect(panel.locator("ol.pasos li").first()).toBeVisible();
    expect(await panel.locator("ol.pasos li").count(), ruta).toBeGreaterThanOrEqual(4);
    await panel.getByRole("button", { name: "Entendido" }).click();
    await expect(boton).toBeFocused();
  }
});

async function clicMedido(page: Page, nombre: string) {
  const enlace = page.getByRole("navigation", { name: "Menú principal" }).getByRole("link", { name: nombre, exact: true });
  await enlace.hover();
  return enlace.evaluate(
    (el) =>
      new Promise<{ resaltado: number }>((listo) => {
        const t0 = performance.now();
        (el as HTMLElement).click();
        const revisar = () => (el.getAttribute("aria-current") === "page" ? listo({ resaltado: performance.now() - t0 }) : requestAnimationFrame(revisar));
        revisar();
      }),
  );
}

test("Menú lateral: 10 clics seguidos, resaltado en menos de 100 ms y sección en menos de 1 s", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await entrar(page);
  const recorrido: [string, RegExp][] = [
    ["Asistencia", /Asistencia de la semana/],
    ["Semana", /Pagos de la semana/],
    ["Recibos", /^Recibos/],
    ["Faltas", /^Faltas/],
    ["Trabajadores", /^Trabajadores/],
    ["Préstamos", /Préstamos y adelantos/],
    ["Nuevo recibo", /Nuevo recibo/],
    ["Pagos del día", /Hoy|Ayer|Pagos del día/],
    ["Faltas", /^Faltas/],
    ["Asistencia", /Asistencia de la semana/],
  ];
  for (const [nombre, titulo] of recorrido) {
    const t0 = Date.now();
    const { resaltado } = await clicMedido(page, nombre);
    expect(resaltado, `resaltado de ${nombre}`).toBeLessThan(100);
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible({ timeout: 1000 });
    expect(Date.now() - t0, `contenido de ${nombre}`).toBeLessThan(1000);
  }
});

test("Hoja semanal de los que cobran cada día: montos por día, total y una sola firma; foto la marca firmada", async ({ page }) => {
  const lunes = semanaDe(sumarDias(HOY, -7)).inicio;
  await reciboComo(BETO, lunes, lunes, lunes);
  await reciboComo(BETO, sumarDias(lunes, 2), sumarDias(lunes, 2), sumarDias(lunes, 2), 0.5);
  await entrar(page);
  await page.goto(`/semana?semana=${lunes}`);
  await page.getByRole("link", { name: /Hoja semanal para firmar/ }).click();
  await page.waitForURL(/\/imprimir\/semanal/);
  const fila = page.locator(".semanal tbody tr", { hasText: "Beto Ejemplo" });
  await expect(fila.locator("td.monto").nth(0)).toHaveText("$380.00");
  await expect(fila.locator("td.monto").nth(2)).toHaveText("$190.00");
  await expect(fila.locator("td.total")).toContainText("$570.00");
  await expect(fila.locator("td.firma")).toHaveCount(1);
  await expect(page.locator(".semanal thead th", { hasText: "Firma" })).toHaveCount(1);
  await page.getByLabel("Foto o escaneo de la hoja firmada").setInputFiles({ name: "hoja.png", mimeType: "image/png", buffer: FOTO });
  await page.getByRole("button", { name: "Subir y marcar como firmados" }).click();
  await expect(page.locator(".alerta.ok")).toContainText("2 recibos");
  const estados = await sql<{ estado: string }>(`select estado from recibos where trabajador_id = '${BETO}'`);
  expect(estados.every((e) => e.estado === "firmado")).toBe(true);
});

test("Comprobante en hoja carta: patrón, trabajador, desglose, condiciones, alimentación, conformidad y dos firmas", async ({ page }) => {
  // Rosa ($2,184 por 6 días de 8 h) gana menos que el mínimo proporcional: sale la nota de la comida.
  const sabado = sumarDias(semanaDe(HOY).inicio, -2);
  await reciboComo(ROSA, sumarDias(sabado, -6), sabado, sabado);
  const [{ id }] = await sql<{ id: string }>("select id from recibos");
  await entrar(page);
  await page.goto(`/imprimir?ids=${id}`);
  const hoja = page.locator(".pliego .hoja").first();
  for (const texto of [
    "Restaurante Los Curros",
    "Recibo de pago de salario",
    "Rosa Prueba",
    "Periodo pagado",
    "Percepciones",
    "Deducciones",
    "Total percepciones",
    "Total deducciones",
    "Neto pagado en efectivo",
    "Alimentación durante la jornada, sin costo para el trabajador",
    "se registra como parte de la compensación",
    "Condiciones de trabajo",
    "Horario",
    "Lugar",
    "Recibí de Restaurante Los Curros",
    "Firma o huella de Rosa Prueba",
    "Por el patrón",
  ]) {
    await expect(hoja, texto).toContainText(texto);
  }
  await expect(page.locator(".pliego")).toHaveCount(2); // original y copia, cada una en su hoja
  await page.emulateMedia({ media: "print" });
  const desborde = await page.locator(".pliego .hoja").evaluateAll((els) => els.map((e) => e.scrollHeight - e.clientHeight));
  expect(Math.max(...desborde), "el comprobante cabe en la hoja carta").toBeLessThanOrEqual(0);
});
