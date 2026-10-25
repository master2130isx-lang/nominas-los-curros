import { expect, test } from "@playwright/test";
import { BETO, entrar, limpiar, LUPE, objetivosTactiles, ROSA, sinDesbordeHorizontal, sql, TONO } from "./ayuda";
import { LUNES_PASADO, SABADO, sumarDias } from "./fechas";

test.beforeEach(async ({ page }) => {
  await limpiar();
  await entrar(page);
});

test("Pagos del día a 375 px: selector de falta en panel, Cancelar, Escape, Guardar y Quitar", async ({ page }) => {
  await page.goto(`/?fecha=${SABADO}`);
  await sinDesbordeHorizontal(page);
  await expect(page.getByLabel("Ir a una fecha")).toBeVisible();
  await expect(page.getByRole("link", { name: "Corregir días anteriores" })).toBeVisible();

  const fila = page.locator(".persona", { hasText: "Beto Ejemplo" });
  await fila.scrollIntoViewIfNeeded();
  const antes = await fila.boundingBox();
  const boton = fila.getByRole("button", { name: /^Marcar falta de Beto Ejemplo/ });
  await boton.click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  expect(await fila.boundingBox()).toEqual(antes); // la fila no se mueve
  await sinDesbordeHorizontal(page);
  // Sin tipo preseleccionado: Guardar deshabilitado hasta escoger.
  await expect(panel.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Guardar" })).toBeDisabled();
  // Tarjetas de 44 px o más; a los de pago por día no se les muestra el descuento.
  for (const tarjeta of await panel.locator(".tipo-falta").all()) expect((await tarjeta.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(panel.locator(".descuento")).toHaveCount(0);
  await objetivosTactiles(page, "dialog[open]");

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(boton).toBeFocused();

  await boton.click();
  await panel.getByRole("button", { name: "Cancelar" }).click();
  await expect(panel).toBeHidden();
  await expect(boton).toBeFocused();

  // El foco no sale del panel con Tab.
  await boton.click();
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true);

  await panel.getByText("Sin aviso (injustificada)").click();
  await expect(panel.getByRole("button", { name: "Guardar" })).toBeEnabled();
  await panel.getByRole("button", { name: "Guardar" }).click();
  await expect(panel).toBeHidden();
  await expect(fila.getByText("Falta · sin aviso")).toBeVisible();

  await fila.getByRole("button", { name: /Corregir o quitar/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Quitar falta" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Sí, quitar" }).click();
  await expect(fila.getByRole("button", { name: /^Marcar falta de Beto Ejemplo/ })).toBeVisible();

  // Moverse a fechas pasadas.
  await page.getByRole("link", { name: "Día anterior" }).click();
  await expect(page).toHaveURL(new RegExp(`fecha=${sumarDias(SABADO, -1)}`));
});

test("Asistencia: 5 faltas de 3 trabajadores de la semana pasada en menos de un minuto, sin cambiar de pantalla", async ({ page }) => {
  await page.goto(`/asistencia?semana=${LUNES_PASADO}`);
  await sinDesbordeHorizontal(page);
  const inicio = Date.now();
  const url = page.url();
  const marcar = async (nombre: string, dia: number, tipo: RegExp, media = false) => {
    const fecha = sumarDias(LUNES_PASADO, dia);
    const celda = page.locator("tbody tr", { hasText: nombre }).locator("td").nth(dia).locator(".celda");
    await celda.click();
    const panel = page.getByRole("dialog");
    await panel.locator(".tipo-falta", { hasText: tipo }).click();
    if (media) await panel.getByLabel(/Solo medio día/).check();
    await panel.getByRole("button", { name: "Guardar" }).click();
    await expect(panel).toBeHidden();
    await expect(celda).toHaveClass(/falta/);
    return fecha;
  };
  await marcar("Rosa Prueba", 1, /Sin aviso/);
  await marcar("Rosa Prueba", 3, /Permiso sin goce/, true);
  await marcar("Beto Ejemplo", 0, /Justificada/);
  await marcar("Toño Sin Días", 2, /Sin aviso/); // sin días de trabajo marcados: aparece y se marca
  await marcar("Toño Sin Días", 6, /Permiso sin goce/);
  expect(Date.now() - inicio).toBeLessThan(60_000);
  expect(page.url()).toBe(url);

  const filas = await sql<{ trabajador_id: string; tipo: string; fraccion: string }>(
    "select trabajador_id, tipo, fraccion from faltas order by fecha",
  );
  expect(filas).toHaveLength(5);
  expect(new Set(filas.map((f) => f.trabajador_id))).toEqual(new Set([ROSA, BETO, TONO]));
  expect(filas.find((f) => f.trabajador_id === ROSA && f.tipo === "sin_goce")?.fraccion).toBe("0.5");
  await objetivosTactiles(page);
});

test("Asistencia: los días ya pagados muestran el folio y no se pueden marcar", async ({ page }) => {
  await sql(`begin;
    select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
    select crear_recibo('${LUPE}', '${sumarDias(LUNES_PASADO, 4)}', '${sumarDias(LUNES_PASADO, 4)}', '${sumarDias(LUNES_PASADO, 4)}', 1);
    commit;`);
  await page.goto(`/asistencia?semana=${LUNES_PASADO}`);
  const celda = page.locator("tbody tr", { hasText: "Lupe Demo" }).locator("td").nth(4).locator(".celda");
  await expect(celda).toContainText("F0001");
  await expect(celda).toHaveAttribute("href", /\/recibos\//);
  await expect(celda).toHaveAccessibleName(/No se puede marcar/);
});

test("Anotar una falta en un periodo ya pagado avisa con folio y enlace, sin guardar", async ({ page }) => {
  const dia = sumarDias(LUNES_PASADO, 2);
  await sql(`begin;
    select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
    select crear_recibo('${ROSA}', '${sumarDias(LUNES_PASADO, -1)}', '${sumarDias(LUNES_PASADO, 5)}', '${sumarDias(LUNES_PASADO, 5)}', 1);
    commit;`);
  await page.goto("/faltas");
  await page.locator("#trabajador_id").selectOption({ label: "Rosa Prueba" });
  await page.getByLabel("Día que faltó").fill(dia);
  // Rosa es de semana fija: aquí sí se muestra cuánto se descuenta.
  await expect(page.locator(".tipo-falta .descuento").first()).toBeVisible();
  await page.locator(".tipo-falta", { hasText: "Sin aviso" }).click();
  await page.getByRole("button", { name: "Anotar falta" }).click();
  const alerta = page.locator(".alerta[role=alert]");
  await expect(alerta).toContainText("folio 0001");
  await expect(alerta.getByRole("link", { name: "Ver recibo folio 0001" })).toHaveAttribute("href", /\/recibos\/[0-9a-f-]{36}$/);
  expect(await sql("select id from faltas")).toHaveLength(0);
});

test("Editar el tipo de una falta pendiente cambia el descuento del siguiente recibo", async ({ page }) => {
  // Falta sin aviso de Rosa en la semana que cobra el sábado.
  const dia = sumarDias(SABADO, -3);
  await sql(`insert into faltas (trabajador_id, fecha, tipo, creado_por) values ('${ROSA}', '${dia}', 'sin_aviso', '00000000-0000-4000-8000-0000000000e1')`);
  await page.goto(`/?fecha=${SABADO}`);
  const lote = page.locator("tbody tr", { hasText: "Rosa Prueba" });
  await expect(lote.getByText("$1,820.00")).toBeVisible(); // 2,184 − 364

  await page.goto(`/faltas?trabajador=${ROSA}`);
  await page.getByRole("button", { name: /Editar la falta de Rosa Prueba/ }).click();
  const panel = page.getByRole("dialog");
  await expect(panel.getByRole("radio", { name: /Sin aviso/ })).toBeChecked();
  await panel.locator(".tipo-falta", { hasText: "Permiso sin goce" }).click();
  await panel.getByRole("button", { name: "Guardar" }).click();
  await expect(panel).toBeHidden();
  await expect(page.locator("tbody").getByText("Falta · sin goce")).toBeVisible();
  expect((await sql<{ tipo: string }>("select tipo from faltas"))[0].tipo).toBe("sin_goce");

  await page.goto(`/?fecha=${SABADO}`);
  await expect(page.locator("tbody tr", { hasText: "Rosa Prueba" }).getByText("$1,872.00")).toBeVisible(); // 2,184 − 312
});

test("Faltas: ?trabajador=abc avisa en lugar de mostrar una lista vacía, y se ven faltas de hace más de 90 días", async ({ page }) => {
  await page.goto("/faltas?trabajador=abc");
  await expect(page.locator(".alerta[role=alert]")).toContainText("no es válido");
  await sql(`insert into faltas (trabajador_id, fecha, tipo, creado_por) values ('${BETO}', current_date - 200, 'justificada', '00000000-0000-4000-8000-0000000000e1')`);
  await page.goto("/faltas");
  await page.getByRole("link", { name: "Ver todo el último año" }).click();
  await expect(page.locator("tbody tr", { hasText: "Beto Ejemplo" })).toHaveCount(1);
  await sinDesbordeHorizontal(page);
  await objetivosTactiles(page);
});
