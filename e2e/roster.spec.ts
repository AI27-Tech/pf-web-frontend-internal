/*
 * Roster del Jefe Operativo (E8-T21) contra el bundle mock: el usuario demo es
 * `jefe_operativo`, ve la entrada Roster y da de alta una unidad. Los handlers MSW
 * aplican las reglas del servidor (src/mocks/roster.ts).
 */

import { expect, test } from '@playwright/test';

test('el Jefe Operativo entra a Roster por la navegación y da de alta una unidad', async ({
  page,
}) => {
  await page.goto('/login?redirect=/viajes');
  await page.getByPlaceholder('nombre@empresa.com').fill('operador@demo.ai27');
  await page.getByPlaceholder('••••••••').fill('demo1234');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/viajes$/);

  await page.getByRole('link', { name: 'Roster' }).click();
  await expect(page).toHaveURL(/\/roster$/);
  const roster = page.getByRole('table', { name: 'Roster de unidades' });
  await expect(roster.getByText('P-101 · ABC-1234')).toBeVisible();

  await page.getByRole('button', { name: 'Nueva unidad' }).click();
  await page.getByRole('button', { name: 'Elige un vehículo' }).click();
  await page.getByRole('button', { name: 'P-102 · DEF-5678 (coche)' }).click();
  // La casilla nativa queda tras su caja visual: el usuario hace clic en la etiqueta.
  await page.getByText('María Torres').click();
  await expect(page.getByRole('checkbox', { name: 'María Torres' })).toBeChecked();
  await page.getByRole('button', { name: 'Crear unidad' }).click();

  await expect(page.getByText('Unidad creada.')).toBeVisible();

  // La unidad nueva es la última del roster y la página tiene cinco filas: avanza hasta encontrarla.
  const fila = roster.getByRole('row', { name: /P-102 · DEF-5678/ });
  const siguiente = page.getByRole('button', { name: 'Página siguiente' });
  for (let pagina = 2; pagina <= 5 && !(await fila.isVisible()); pagina++) {
    await siguiente.click();
    await expect(page.getByText(`Página ${pagina}`)).toBeVisible();
  }
  await expect(fila).toContainText('María Torres');
});
