/*
 * Login del panel interno, contra el bundle mock.
 *
 * Minimo a proposito: hoy el panel mas alla del login es placeholder (sin AppShell
 * ni navegacion; eso llega en E8-T4 y siguientes). Esta prueba solo verifica que la
 * pantalla de login renderiza, que es lo construido en V1. No se prueban pantallas
 * que aun no existen (hallazgo F-06: no probar superficie inexistente).
 */

import { expect, test } from '@playwright/test';

test.describe('login', () => {
  test('la pantalla de login renderiza', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Iniciar sesión', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Correo electrónico empresarial')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });
});
