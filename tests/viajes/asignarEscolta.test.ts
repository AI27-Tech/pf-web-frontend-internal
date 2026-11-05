import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { API_PREFIX } from '@/lib/constants';
import { asignarEscolta, ErrorAsignacion } from '@/lib/api/viajeDetalle';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('asignarEscolta', () => {
  it('usa POST /viajes/{id}/asignacion con el cuerpo de unidades', async () => {
    let recibido: unknown;
    server.use(
      http.post(path('/viajes/:id/asignacion'), async ({ params, request }) => {
        recibido = { id: params.id, body: await request.json() };
        return HttpResponse.json(
          {
            viaje_id: 'VJ-1',
            unidades: [
              {
                unidad_id: 'UN-1',
                aptitud: [{ recurso: 'vehiculo', recurso_id: 'VEH-1', estado: 'apto' }],
              },
            ],
          },
          { status: 200 },
        );
      }),
    );

    await expect(asignarEscolta('VJ-1', { unidades_ids: ['UN-1'] }, 'token')).resolves.toEqual(
      expect.objectContaining({ viaje_id: 'VJ-1' }),
    );
    expect(recibido).toEqual({ id: 'VJ-1', body: { unidades_ids: ['UN-1'] } });
  });

  it('clasifica el 409 contractual de carrera como ErrorAsignacion', async () => {
    server.use(
      http.post(path('/viajes/:id/asignacion'), () =>
        HttpResponse.json({ error: { codigo: 'recurso_no_disponible' } }, { status: 409 }),
      ),
    );

    await expect(
      asignarEscolta('VJ-1', { unidades_ids: ['UN-1'] }, 'token'),
    ).rejects.toBeInstanceOf(ErrorAsignacion);
  });

  it('propaga un 404 como ApiError', async () => {
    server.use(
      http.post(path('/viajes/:id/asignacion'), () =>
        HttpResponse.json({ mensaje: 'Viaje no encontrado' }, { status: 404 }),
      ),
    );

    await expect(
      asignarEscolta('VJ-404', { unidades_ids: ['UN-1'] }, 'token'),
    ).rejects.toMatchObject({
      kind: 'noEncontrado',
      status: 404,
    });
  });
});
