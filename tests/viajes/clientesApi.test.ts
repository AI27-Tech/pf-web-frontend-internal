import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { API_PREFIX } from '@/lib/constants';
import { listarClientes, listarTodosClientes } from '@/lib/api/clientes';
import { server } from './mswServer';

const path = (segment: string) => `${API_PREFIX}${segment}`;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('clientesApi', () => {
  it('consulta una página de clientes con cursor', async () => {
    let recibido: string | null = null;
    server.use(
      http.get(path('/clientes'), ({ request }) => {
        recibido = new URL(request.url).searchParams.get('cursor');
        return HttpResponse.json(
          {
            items: [{ id: 'CLI-1', nombre: 'Cliente Uno', estado: 'activo' }],
            cursor_siguiente: null,
          },
          { status: 200 },
        );
      }),
    );

    await expect(listarClientes({ cursor: 'cursor-1' }, 'token')).resolves.toMatchObject({
      items: [{ id: 'CLI-1', nombre: 'Cliente Uno' }],
    });
    expect(recibido).toBe('cursor-1');
  });

  it('agrega todas las páginas sin exponer el cursor al selector', async () => {
    const cursores: (string | null)[] = [];
    server.use(
      http.get(path('/clientes'), ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursores.push(cursor);
        return cursor === null
          ? HttpResponse.json({
              items: [{ id: 'CLI-1', nombre: 'Cliente Uno', estado: 'activo' }],
              cursor_siguiente: '2',
            })
          : HttpResponse.json({
              items: [{ id: 'CLI-2', nombre: 'Cliente Dos', estado: 'activo' }],
              cursor_siguiente: null,
            });
      }),
    );

    await expect(listarTodosClientes('token')).resolves.toEqual([
      { id: 'CLI-1', nombre: 'Cliente Uno', estado: 'activo' },
      { id: 'CLI-2', nombre: 'Cliente Dos', estado: 'activo' },
    ]);
    expect(cursores).toEqual([null, '2']);
  });
});
