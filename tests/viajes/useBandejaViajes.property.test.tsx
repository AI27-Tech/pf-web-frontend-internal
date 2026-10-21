/*
 * Feature: e8-t7-bandeja-viajes, Property 5: Estado del control de paginación
 * como función de `cursor_siguiente`.
 *
 * Property 5 (Validates: Requirements 4.1, 4.2, 4.3):
 * Para todo valor de `cursor_siguiente` servido por el bff, el hook habilita la
 * acción de siguiente página si y solo si `cursor_siguiente` no es nulo; cuando
 * es nulo no hay cursor; y al avanzar se reenvía ese mismo valor como el
 * parámetro `cursor` de la siguiente petición.
 *
 * La propiedad "habilitar ↔ cursor no nulo" se recorre con una muestra de valores
 * (incluido el caso nulo) servidos por MSW; el reenvío del cursor al avanzar se
 * verifica capturando el query param en el handler. Se usan casos deterministas
 * en vez de 100 corridas async sobre MSW para que la prueba sea estable.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';

import { useBandejaViajes } from '@/features/viajes/useBandejaViajes';
import { BFF_VIAJES, server } from './mswServer';

// La sesión viva se mockea: el hook solo necesita un accessToken.
vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({ sesion: { accessToken: 'token-de-prueba' } }),
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Wrapper con un QueryClient de prueba fresco (sin reintentos, igual que prod). */
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('Feature: e8-t7-bandeja-viajes, Property 5: control de paginación por cursor_siguiente', () => {
  // Muestra que recorre el dominio de `cursor_siguiente`: nulo y varios no nulos.
  const CASOS: Array<string | null> = [null, 'cursor-abc', 'xYz-123', 'pagina-999'];

  it.each(CASOS)('cursorSiguiente refleja el valor del bff (%s)', async (cursorSiguiente) => {
    server.use(
      http.get(BFF_VIAJES, () =>
        HttpResponse.json({ items: [], cursor_siguiente: cursorSiguiente }),
      ),
    );

    const { result } = renderHook(() => useBandejaViajes(), { wrapper });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    // Habilita "siguiente" si y solo si cursor_siguiente no es nulo.
    expect(result.current.cursorSiguiente).toBe(cursorSiguiente);
  });

  it('avanzar reenvía el mismo cursor_siguiente como parámetro cursor', async () => {
    const cursor1 = 'cursor-pagina-2';
    const cursorsRecibidos: Array<string | null> = [];

    server.use(
      http.get(BFF_VIAJES, ({ request }) => {
        const recibido = new URL(request.url).searchParams.get('cursor');
        cursorsRecibidos.push(recibido);
        // La primera página (sin cursor) entrega cursor1; la segunda ya no tiene.
        return HttpResponse.json({
          items: [],
          cursor_siguiente: recibido === cursor1 ? null : cursor1,
        });
      }),
    );

    const { result } = renderHook(() => useBandejaViajes(), { wrapper });
    await waitFor(() => expect(result.current.cursorSiguiente).toBe(cursor1));
    expect(result.current.pagina).toBe(1);

    // Avanzar a la página 2: el hook reenvía el cursor_siguiente recibido como `cursor`.
    act(() => result.current.irAPagina(2));
    await waitFor(() => expect(result.current.pagina).toBe(2));
    await waitFor(() => expect(result.current.cursorSiguiente).toBeNull());

    expect(cursorsRecibidos[0]).toBeNull(); // primera petición sin cursor
    expect(cursorsRecibidos).toContain(cursor1); // la siguiente llevó el cursor recibido
  });
});
