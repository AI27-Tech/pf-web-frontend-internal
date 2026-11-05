/*
 * Servidor MSW compartido para las pruebas de la bandeja de viajes (E8-T7).
 *
 * Arranca sin handlers; cada prueba registra los suyos con `server.use(...)`.
 * `API_BASE_URL` es vacío en test, así que las peticiones salen a
 * `http://localhost/api/v1/viajes`; los handlers interceptan ahí.
 */

import { setupServer } from 'msw/node';

/**
 * Patrón de ruta del listado de viajes para los handlers de MSW.
 * Wildcard de origen: casa la petición del cliente (ruta relativa `/api/v1/viajes`
 * resuelta por jsdom) sin depender del origen exacto.
 */
export const BFF_VIAJES = '*/api/v1/viajes';

/** Servidor MSW compartido entre las pruebas de viajes. */
export const server = setupServer();
