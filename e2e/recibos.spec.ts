import { expect, test } from "@playwright/test";
import { BETO, entrar, limpiar, ROSA, sinDesbordeHorizontal, sql } from "./ayuda";
import { SABADO, sumarDias } from "./fechas";

// PNG de 1×1 para simular la foto del recibo firmado.
const FOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test.beforeEach(async ({ page }) => {
  await limpiar();
  await page.addInitScript(() => {
    window.print = () => {};
  });
});

test("Lote del día desde Por cobrar: recibos con folio, impresión con original y copia, y contador", async ({ page }) => {
  await entrar(page);
  await page.goto(`/?fecha=${SABADO}`);
  await sinDesbordeHorizontal(page);
  const boton = page.getByRole("button", { name: /^Hacer \d+ recibos? e imprimir/ });
  await expect(boton).toBeEnabled();
  await boton.click();
  await page.waitForURL(/\/imprimir\?ids=/);
  await expect(page.getByText("ORIGINAL", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("COPIA PARA EL TRABAJADOR").first()).toBeVisible();
  const recibos = await sql<{ id: string; folio: number; impresiones: number }>("select id, folio, impresiones from recibos order by folio");
  expect(recibos.length).toBeGreaterThanOrEqual(2);
  expect(recibos.map((r) => r.folio)).toEqual(recibos.map((_, i) => i + 1));
  await page.getByRole("button", { name: "Imprimir" }).click();
  await expect.poll(async () => (await sql<{ n: number }>("select min(impresiones)::int as n from recibos"))[0].n).toBe(1);
  await page.reload();
  await expect(page.getByText(/REIMPRESIÓN · ORIGINAL/).first()).toBeVisible();
});

test("Recibo individual: vista previa, abono FIFO, folio, foto firmada y cancelación solo del admin", async ({ page }) => {
  await sql(`insert into adelantos (trabajador_id, fecha, monto, descripcion, creado_por) values
    ('${BETO}', current_date - 20, 300, 'medicina', '00000000-0000-4000-8000-0000000000e1'),
    ('${BETO}', current_date - 5, 800, null, '00000000-0000-4000-8000-0000000000e1')`);
  await entrar(page);
  const dia = sumarDias(SABADO, -1);
  await page.goto(`/recibos/nuevo?trabajador=${BETO}&fecha=${dia}`);
  await page.getByLabel(/Cantidad trabajada/).fill("2");
  await page.getByLabel("Cuánto abona").fill("500");
  const vista = page.getByRole("region", { name: "Vista previa del recibo" });
  await expect(vista).toContainText("queda pagado");
  await expect(vista).toContainText("resta $600.00");
  // 2 días × 350 + 2 × 30 pasaje − 500 abono = 260
  await page.getByRole("button", { name: "Guardar recibo por $260.00" }).click();
  await page.waitForURL(/\/recibos\/[0-9a-f-]{36}\?nuevo=1/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Recibo folio 0001");
  const abonos = await sql<{ monto: string; descripcion: string | null }>(
    "select ab.monto, a.descripcion from abonos ab join adelantos a on a.id = ab.adelanto_id order by a.fecha",
  );
  expect(abonos).toEqual([
    { monto: "300.00", descripcion: "medicina" },
    { monto: "200.00", descripcion: null },
  ]);

  // Una encargada no ve la cancelación.
  await expect(page.getByRole("heading", { name: "Cancelar recibo" })).toHaveCount(0);

  await page.getByLabel("Foto o escaneo").setInputFiles({ name: "recibo.png", mimeType: "image/png", buffer: FOTO });
  await page.getByRole("button", { name: "Subir y marcar como firmado" }).click();
  await expect(page.getByText("Pagado y firmado")).toBeVisible();

  // El admin cancela: los abonos regresan al saldo.
  const url = page.url().replace("?nuevo=1", "");
  await page.getByRole("button", { name: "Salir" }).click();
  await entrar(page, "admin@ejemplo.test", "prueba-admin-123");
  await page.goto(url);
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Motivo").fill("prueba de cancelación");
  await page.getByRole("button", { name: "Cancelar recibo" }).click();
  await expect(page.locator(".alerta", { hasText: "Cancelado" })).toBeVisible();
  expect(await sql("select id from abonos")).toHaveLength(0);
});

test("La cancelación libera las faltas para el siguiente recibo", async ({ page }) => {
  const dia = sumarDias(SABADO, -2);
  await sql(`insert into faltas (trabajador_id, fecha, tipo, creado_por) values ('${ROSA}', '${dia}', 'sin_aviso', '00000000-0000-4000-8000-0000000000e1')`);
  await sql(`begin;
    select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
    select crear_recibo('${ROSA}', '${sumarDias(SABADO, -6)}', '${SABADO}', '${SABADO}', 1);
    commit;`);
  expect((await sql<{ recibo_id: string | null }>("select recibo_id from faltas"))[0].recibo_id).not.toBeNull();
  await entrar(page, "admin@ejemplo.test", "prueba-admin-123");
  const [{ id }] = await sql<{ id: string }>("select id from recibos");
  await page.goto(`/recibos/${id}`);
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Motivo").fill("faltó capturar");
  await page.getByRole("button", { name: "Cancelar recibo" }).click();
  await expect(page.locator(".alerta", { hasText: "Cancelado" })).toBeVisible();
  expect((await sql<{ recibo_id: string | null }>("select recibo_id from faltas"))[0].recibo_id).toBeNull();
});
