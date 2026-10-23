import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { listarUnidades } from '@/lib/api/unidades';
import { API_PREFIX } from '@/lib/constants';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('listarUnidades', () => {
  it('usa GET /unidades y desempaqueta la página del roster', async () => {
    server.use(
      http.get(path('/unidades'), () =>
        HttpResponse.json({
          items: [
            {
              id: 'UN-1',
              vehiculo_id: 'VEH-1',
              custodios_ids: ['CUS-1'],
              tipo: 'moto',
              activa: true,
            },
          ],
          cursor_siguiente: null,
        }),
      ),
    );

    await expect(listarUnidades('token')).resolves.toEqual([
      {
        id: 'UN-1',
        vehiculo_id: 'VEH-1',
        custodios_ids: ['CUS-1'],
        tipo: 'moto',
        activa: true,
      },
    ]);
  });

  it('propaga ApiError cuando el roster falla', async () => {
    server.use(
      http.get(path('/unidades'), () =>
        HttpResponse.json({ mensaje: 'No autorizado' }, { status: 401 }),
      ),
    );

    await expect(listarUnidades('token')).rejects.toMatchObject({
      kind: 'noAutorizado',
      status: 401,
    });
  });
});
