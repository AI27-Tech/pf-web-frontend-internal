/*
 * Arranque del backend simulado en el navegador (MSW).
 *
 * Se importa dinámicamente desde main.tsx solo cuando VITE_ENABLE_MOCKS está
 * activo, así que ni MSW ni los handlers entran en el bundle con la bandera
 * apagada. Ver README, "El backend simulado".
 */

import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

const worker = setupWorker(...handlers);

/** Registra el service worker de MSW y espera a que esté listo. */
export async function enableMocks(): Promise<void> {
  await worker.start({
    // Peticiones sin handler pasan a la red real sin ruido en consola.
    onUnhandledRequest: 'bypass',
  });
}
