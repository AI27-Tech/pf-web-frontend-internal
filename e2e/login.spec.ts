/*
 * Login del panel interno, contra el bundle mock.
 *
 * Estas pruebas cubren el render inicial y el flujo de credenciales válidas
 * contra el bundle mock.
 */

import { expect, test } from '@playwright/test';

test.describe('login', () => {
  test('la pantalla de login renderiza', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Iniciar sesión', level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder('nombre@empresa.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('el login envía el segundo factor capturado en el mismo request', async ({ page }) => {
    const loginRequest = page.waitForRequest(
      (request) =>
        request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/api/v1/sesion'),
    );

    await page.goto('/login?redirect=/monitoreo/dashboard');
    await page.getByPlaceholder('nombre@empresa.com').fill('operador@demo.ai27');
    await page.getByPlaceholder('••••••••').fill('demo1234');
    await page.getByPlaceholder('Código de 6 dígitos').fill('123456');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    const request = await loginRequest;
    expect(request.postDataJSON()).toEqual({
      usuario: 'operador@demo.ai27',
      contrasena: 'demo1234',
      segundo_factor: '123456',
    });
  });

  test('credenciales válidas conceden sesión y navegan al destino', async ({ page }) => {
    await page.goto('/login?redirect=/monitoreo/dashboard');

    await page.getByPlaceholder('nombre@empresa.com').fill('operador@demo.ai27');
    await page.getByPlaceholder('••••••••').fill('demo1234');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/monitoreo\/dashboard$/);
    await expect(
      page.getByRole('heading', { name: 'Dashboard de Monitoreo', level: 1 }),
    ).toBeVisible();
  });
});
