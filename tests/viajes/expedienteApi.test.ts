/**
 * Clasificación del wrapper `descargarViaje` (E8-T17, tarea 10).
 * `403` → ErrorDescargaProhibida, `404` → ErrorViajeInexistente, `401` pasa como
 * sesionFinalizada y la red pasa sin cambio.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import {
  descargarViaje,
  ErrorDescargaProhibida,
  ErrorViajeInexistente,
} from '@/lib/api/expediente';
import { ApiError } from '@/lib/api/errors';
import { API_PREFIX } from '@/lib/constants';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const expedienteDemo = {
  viaje_id: 'VJ-1',
  ficha: { estado: 'en_curso', origen: 'Origen', destinos: [{ nombre: 'Destino' }] },
  bitacora: [],
  auditoria: [],
  generado_en: '2026-11-04T10:00:00.000Z',
};

describe('descargarViaje — wrapper', () => {
  it('devuelve el JSON del bff sin transformarlo', async () => {
    server.use(http.get(path('/viajes/:id/descarga'), () => HttpResponse.json(expedienteDemo)));

    await expect(descargarViaje('VJ-1', 'token')).resolves.toEqual(expedienteDemo);
  });

  it('clasifica 403 como ErrorDescargaProhibida con status 403', async () => {
    server.use(
      http.get(path('/viajes/:id/descarga'), () =>
        HttpResponse.json({ mensaje: 'prohibido' }, { status: 403 }),
      ),
    );

    const error = await descargarViaje('VJ-1', 'token').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDescargaProhibida);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'noAutorizado', status: 403 });
  });

  it('clasifica 404 como ErrorViajeInexistente con status 404', async () => {
    server.use(
      http.get(path('/viajes/:id/descarga'), () =>
        HttpResponse.json({ mensaje: 'no existe' }, { status: 404 }),
      ),
    );

    const error = await descargarViaje('VJ-x', 'token').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorViajeInexistente);
    expect(error).toMatchObject({ kind: 'noEncontrado', status: 404 });
  });

  it('deja pasar 401 como sesionFinalizada, sin clasificarlo', async () => {
    server.use(
      http.get(path('/viajes/:id/descarga'), () =>
        HttpResponse.json({ mensaje: 'no autenticado' }, { status: 401 }),
      ),
    );

    const error = await descargarViaje('VJ-1', 'token').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(ErrorDescargaProhibida);
    expect(error).toMatchObject({ kind: 'sesionFinalizada' });
  });

  it('deja pasar un fallo de red sin cambio', async () => {
    server.use(http.get(path('/viajes/:id/descarga'), () => HttpResponse.error()));

    const error = await descargarViaje('VJ-1', 'token').catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(ErrorDescargaProhibida);
    expect(error).not.toBeInstanceOf(ErrorViajeInexistente);
    expect(error).toMatchObject({ kind: 'red' });
  });
});
