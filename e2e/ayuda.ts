import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

export const URL_BD = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
export const ROSA = "10000000-0000-4000-8000-000000000001";
export const BETO = "10000000-0000-4000-8000-000000000002";
export const LUPE = "10000000-0000-4000-8000-000000000003";
export const TONO = "10000000-0000-4000-8000-000000000004";

export async function entrar(page: Page, correo = "encargado@ejemplo.test", clave = "prueba-encargado-123") {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(clave);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

/** Corre SQL como postgres en la base local (para preparar o limpiar datos de prueba). */
export async function sql<T = Record<string, unknown>>(consulta: string, valores: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: URL_BD });
  await c.connect();
  try {
    return (await c.query(consulta, valores)).rows as T[];
  } finally {
    await c.end();
  }
}

/** Borra lo que dejaron las pruebas (recibos, faltas, préstamos) y deja a los trabajadores como en el seed. */
export async function limpiar() {
  await sql(`
    alter table recibos disable trigger recibos_no_borrar;
    delete from abonos; delete from faltas; delete from recibo_conceptos; delete from recibos; delete from adelantos;
    alter table recibos enable trigger recibos_no_borrar;
    update contador_folios set ultimo = 0;
    update trabajadores set tarifa = 350, telefono = null where id = '${BETO}';
    delete from trabajadores_bitacora where trabajador_id in (select id from trabajadores where nombre like 'Nuevo Ficticio%')
                                         or (campo <> 'alta');
    delete from trabajadores where nombre like 'Nuevo Ficticio%';
  `);
}

export async function sinDesbordeHorizontal(page: Page) {
  const ancho = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(ancho.doc, "la página no debe desbordarse a lo ancho").toBeLessThanOrEqual(ancho.vista);
}

/** Todos los botones, enlaces-botón, radios y casillas visibles miden al menos 44 px de alto. */
export async function objetivosTactiles(page: Page, selector = "main") {
  const chicos = await page.locator(selector).evaluate((raiz) => {
    const lista: string[] = [];
    raiz.querySelectorAll<HTMLElement>("button, a.boton, .casilla, .tipo-falta, .marcar, .celda, input, select").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return; // oculto
      if (el instanceof HTMLInputElement && ["radio", "checkbox", "hidden"].includes(el.type)) return; // se mide su etiqueta
      if (r.height < 44) lista.push(`${el.tagName}.${el.className} "${(el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(r.height)}px`);
    });
    return lista;
  });
  expect(chicos, "objetivos táctiles menores a 44 px").toEqual([]);
}
