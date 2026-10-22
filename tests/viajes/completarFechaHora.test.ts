/*
 * Pruebas del wrapper `completarFechaHora` de viajeDetalle.ts (E8-T9, 2.2).
 *
 * BRECHA DE CONTRATO ABIERTA (Opción A): la operación de escritura de
 * `fecha_hora_servicio` no existe aún en el `bff` (tracer.13). Estas pruebas
 * ejercen el contrato ESPERADO (ruta/verbo/forma) contra un servidor MSW local.
 *
 * Cubre:
 * - Petición correcta (ruta PATCH /viajes/{id}/fecha-hora) y retorno de ViajeDetalle
 * - Clasificación de 409 por el `codigo` real del cuerpo
 * - Propagación de errores no-409 como ApiError (sin convertir a ErrorTransicion)
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { API_PREFIX } from '@/lib/constants';
import { ApiError } from '@/lib/api/errors';
import { ErrorTransicion, completarFechaHora } from '@/lib/api/viajeDetalle';

const path = (segment: string) => `${API_PREFIX}${segment}`;

const DETALLE_OK = {
  viaje: {
    id: 'VJ-1',
    estado: 'SOLICITADO',
    origen: 'Origen',
    destinos: [{ nombre: 'D1', numero_envio: 'E1' }],
    fecha_hora_servicio: '2026-10-21T10:00:00.000Z',
    creado_en: new Date().toISOString(),
  },
  condiciones_activas: [],
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('completarFechaHora', () => {
  it('hace PATCH a /viajes/{id}/fecha-hora con el cuerpo esperado y devuelve el ViajeDetalle', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.patch(path('/viajes/:id/fecha-hora'), async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(DETALLE_OK, { status: 200 });
      }),
    );

    const detalle = await completarFechaHora(
      'VJ-1',
      { fecha_hora_servicio: '2026-10-21T10:00:00.000Z' },
      'token',
    );

    expect(cuerpoRecibido).toEqual({ fecha_hora_servicio: '2026-10-21T10:00:00.000Z' });
    expect(detalle.viaje.id).toBe('VJ-1');
    expect(detalle.viaje.fecha_hora_servicio).toBe('2026-10-21T10:00:00.000Z');
  });

  it('clasifica el 409 por el codigo real del cuerpo', async () => {
    server.use(
      http.patch(path('/viajes/:id/fecha-hora'), () =>
        HttpResponse.json({ error: { codigo: 'transicion_no_permitida' } }, { status: 409 }),
      ),
    );

    await expect(
      completarFechaHora('VJ-1', { fecha_hora_servicio: '2026-10-21T10:00:00.000Z' }, 'token'),
    ).rejects.toMatchObject({ codigo: 'transicion_no_permitida' });
  });

  it('propaga 404 como ApiError, no como ErrorTransicion', async () => {
    server.use(
      http.patch(path('/viajes/:id/fecha-hora'), () =>
        HttpResponse.json({ mensaje: 'no existe' }, { status: 404 }),
      ),
    );

    const err = await completarFechaHora(
      'VJ-1',
      { fecha_hora_servicio: '2026-10-21T10:00:00.000Z' },
      'token',
    ).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(ErrorTransicion);
    expect((err as ApiError).kind).toBe('noEncontrado');
  });
});
