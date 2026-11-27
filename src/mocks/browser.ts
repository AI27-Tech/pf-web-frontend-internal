/*
 * Arranque del backend simulado en el navegador (MSW).
 *
 * Se importa dinámicamente desde main.tsx solo cuando VITE_ENABLE_MOCKS está
 * activo, así que ni MSW ni los handlers entran en el bundle con la bandera
 * apagada. Ver README, "El backend simulado".
 */

import { delay, http } from 'msw';
import { setupWorker } from 'msw/browser';
import { API_PREFIX } from '@/lib/constants';

import { handlers } from './handlers';

/**
 * Latencia artificial: sin ella los estados de carga nunca se ven. Está exagerada a propósito
 * (el portal del cliente usa 900 ms) para que la carga se note.
 */
const LATENCY_MS = 2500;

/*
 * Un solo handler antepuesto a todos los demás: espera y no responde, así que MSW sigue con
 * el handler real de la ruta. Solo vive en el navegador; las pruebas (msw/node) no pasan
 * por aquí y no se hacen más lentas.
 */
const latencia = http.all(`${API_PREFIX}/*`, async () => {
  await delay(LATENCY_MS);
});

const worker = setupWorker(latencia, ...handlers);

/** Registra el service worker de MSW y espera a que esté listo. */
export async function enableMocks(): Promise<void> {
  await worker.start({
    // Peticiones sin handler pasan a la red real sin ruido en consola.
    onUnhandledRequest: 'bypass',
  });
}
