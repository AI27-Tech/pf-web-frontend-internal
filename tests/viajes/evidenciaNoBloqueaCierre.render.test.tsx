/**
 * Property 5 (E8-T17, tarea 29), parte de render: al abrir el detalle del viaje no se emite
 * ninguna solicitud a `/adjuntos`. La evidencia no bloquea ni precarga con el cierre.
 * Complementa la verificación estática de `evidenciaNoBloqueaCierre.test.ts`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { DetalleViaje } from '@/features/viajes/detalle/DetalleViaje';
import { handlers, handlersConversaciones } from '@/mocks/handlers';

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { rol: 'monitorista' },
    logout: vi.fn(),
  }),
}));
vi.mock('@tanstack/react-router', async () => {
  const { createElement } = await import('react');
  return {
    useNavigate: () => vi.fn(),
    Link: ({ to, children }: { to: string; children?: unknown }) =>
      createElement('a', { href: to }, children as never),
  };
});

const server = setupServer(...handlers, ...handlersConversaciones);
const urls: string[] = [];

beforeAll(() => {
  server.events.on('request:start', ({ request }) => {
    urls.push(new URL(request.url).pathname);
  });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  urls.length = 0;
  server.resetHandlers();
});
afterAll(() => server.close());

describe('E8-T17 · el detalle no emite solicitudes a /adjuntos', () => {
  it('al renderizar el detalle no hay ninguna solicitud a /adjuntos', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    render(<DetalleViaje id="VJ-1001" />, { wrapper: Wrapper });

    expect(
      await screen.findByRole('button', { name: 'Ver histórico del viaje' }),
    ).toBeInTheDocument();
    expect(urls.filter((url) => url.includes('/adjuntos'))).toEqual([]);
  });
});
