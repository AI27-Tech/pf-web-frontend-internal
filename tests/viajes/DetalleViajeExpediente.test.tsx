/**
 * Enlace «Expediente y evidencia» en el detalle según el rol (E8-T17, tarea 12).
 * Los roles sin acceso no lo ven; el monitorista sí. `onUnhandledRequest: 'error'`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { DetalleViaje } from '@/features/viajes/detalle/DetalleViaje';
import { handlers, handlersConversaciones } from '@/mocks/handlers';

const sesionRol = vi.hoisted(() => ({ rol: 'monitorista' as string }));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { rol: sesionRol.rol },
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

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  sesionRol.rol = 'monitorista';
});
afterAll(() => server.close());

function renderDetalle() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<DetalleViaje id="VJ-1001" />, { wrapper: Wrapper });
}

describe('DetalleViaje · enlace a Expediente y evidencia por rol', () => {
  it.each(['jefe_operativo', 'ejecutivo', 'reaccion', 'cliente'])(
    'el rol %s no ve el enlace',
    async (rol) => {
      sesionRol.rol = rol;
      renderDetalle();

      expect(
        await screen.findByRole('button', { name: 'Ver histórico del viaje' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Expediente y evidencia' }),
      ).not.toBeInTheDocument();
    },
  );

  it('el monitorista ve el enlace junto a Ver histórico del viaje', async () => {
    renderDetalle();

    expect(
      await screen.findByRole('button', { name: 'Ver histórico del viaje' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expediente y evidencia' })).toBeInTheDocument();
  });
});
