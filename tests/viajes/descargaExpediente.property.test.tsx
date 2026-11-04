/**
 * Feature: e8-t17-dashboard-descarga-evidencia, Property 1: Una pulsación equivale a una solicitud.
 * Validates: Requirements 4.2, 4.3, 4.12 (tarea 11).
 *
 * N pulsaciones síncronas producen una sola solicitud. Al terminar, una nueva pulsación
 * produce una nueva solicitud. Mínimo 100 iteraciones.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import fc from 'fast-check';
import type { ReactNode } from 'react';

import { ExpedienteViaje } from '@/features/viajes/expediente/ExpedienteViaje';
import { API_PREFIX } from '@/lib/constants';
import { descargarViajeMock } from '@/mocks/data';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();
let solicitudes = 0;

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { rol: 'monitorista' },
    logout: vi.fn(),
  }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  URL.createObjectURL = vi.fn(() => 'blob:demo');
  URL.revokeObjectURL = vi.fn();
});
beforeEach(() => {
  solicitudes = 0;
  server.use(
    http.get(path('/viajes/:id/descarga'), async () => {
      solicitudes += 1;
      await delay(15);
      return HttpResponse.json(descargarViajeMock('VJ-1001'));
    }),
    http.get(path('/viajes/:id/adjuntos'), () => HttpResponse.json({ items: [] })),
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function renderExpediente() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ExpedienteViaje id="VJ-1001" />, { wrapper: Wrapper });
}

describe('Property 1 · una pulsación equivale a una solicitud', () => {
  it('N pulsaciones síncronas generan una solicitud; una nueva pulsación genera otra', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 20 }), async (n) => {
        solicitudes = 0;
        vi.mocked(URL.createObjectURL).mockClear();
        renderExpediente();
        const boton = screen.getByRole('button', { name: 'Descargar expediente' });

        for (let i = 0; i < n; i += 1) fireEvent.click(boton);
        // Una descarga exitosa crea un objectURL: es la señal de que la solicitud terminó.
        await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
        expect(solicitudes).toBe(1);

        await waitFor(() =>
          expect(screen.getByRole('button', { name: 'Descargar expediente' })).toBeEnabled(),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Descargar expediente' }));
        await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(2));
        expect(solicitudes).toBe(2);
        cleanup();
      }),
      { numRuns: 100 },
    );
  }, 120_000);
});
