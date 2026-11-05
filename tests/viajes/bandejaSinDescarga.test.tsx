/**
 * Escenario 6 (E8-T17, tarea 12): la bandeja de viajes no ofrece descarga de listados
 * ni en lote. Solo se descarga el expediente de un viaje, desde su detalle.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { BandejaViajes } from '@/features/viajes/BandejaViajes';

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({ sesion: { accessToken: 'token-de-prueba' }, logout: vi.fn() }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const ETIQUETA_DESCARGA = /descarg|export|expediente|imprim|csv|excel|pdf/i;

describe('E8-T17 · Escenario 6: la bandeja no ofrece descarga de listados', () => {
  it('no hay ningún botón de descarga, exportación ni impresión en la bandeja', async () => {
    server.use(
      http.get('*/api/v1/viajes', () =>
        HttpResponse.json({
          items: [
            { id: 'v1', estado: 'EN_TRANSITO', origen: 'CDMX' },
            { id: 'v2', estado: 'SOLICITADO', origen: 'MTY' },
          ],
          cursor_siguiente: null,
        }),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    render(<BandejaViajes />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText('MTY')).toBeInTheDocument());
    const botones = screen.queryAllByRole('button').filter((boton) => {
      const etiqueta = `${boton.textContent ?? ''} ${boton.getAttribute('aria-label') ?? ''}`;
      return ETIQUETA_DESCARGA.test(etiqueta);
    });
    expect(botones).toEqual([]);
  });
});
