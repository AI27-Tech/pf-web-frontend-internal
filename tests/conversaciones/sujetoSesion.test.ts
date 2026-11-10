/*
 * Pruebas del sujeto de conversaciones tras iniciar sesión (tarea 5.3 del spec
 * modo-mock-roles-internos, requisito 2.1).
 *
 * `POST /sesion` del mock reinicia el estado de conversaciones con el sujeto de la
 * cuenta que inicia sesión (`sujetoDeCuenta(cuenta)`). `sujetoConversacionesMock()`
 * devuelve ese sujeto. Ver design.md, "Sujeto activo en conversaciones".
 *
 * El login pasa por `iniciarSesion`, el mismo wrapper que usa la app, así que la
 * petición sale por `POST /api/v1/sesion` y la atiende el handler real de `src/mocks`.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';

import { iniciarSesion } from '@/lib/api/sesion';
import { sujetoConversacionesMock } from '@/mocks/data';
import { handlers } from '@/mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('sujeto de conversaciones tras iniciar sesión', () => {
  it('al iniciar sesión como monitorista, el sujeto del mock es usr-demo-monitorista', async () => {
    await iniciarSesion({ usuario: 'monitorista@demo.ai27', contrasena: 'demo1234' });

    expect(sujetoConversacionesMock()).toBe('usr-demo-monitorista');
  });

  it('al iniciar sesión como operador, el sujeto del mock es usr-demo-operador', async () => {
    // Primero se inicia sesión con otra cuenta para que la prueba no pase
    // por el valor por defecto del estado.
    await iniciarSesion({ usuario: 'monitorista@demo.ai27', contrasena: 'demo1234' });
    expect(sujetoConversacionesMock()).toBe('usr-demo-monitorista');

    await iniciarSesion({ usuario: 'operador@demo.ai27', contrasena: 'demo1234' });

    expect(sujetoConversacionesMock()).toBe('usr-demo-operador');
  });
});
