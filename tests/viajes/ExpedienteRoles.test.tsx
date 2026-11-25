/*
 * M7 · Expediente, evidencia y descarga por rol (spec `afinacion-roles-modulo-a-modulo`,
 * Requirement 8).
 *
 * Cubren: la pantalla y la lista de evidencia solo con `monitoreo.consultar`, sin llamadas para
 * los demás roles, el `404` de la lista y de la descarga como "no encontrado" y el `403` de
 * la lista como "sin permiso".
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { ExpedienteViaje } from '@/features/viajes/expediente/ExpedienteViaje';
import { API_PREFIX } from '@/lib/constants';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();
let rolActual: string | undefined;
const llamadas = { adjuntos: 0, descarga: 0 };

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: rolActual ? { id: 'u-1', rol: rolActual } : null,
    logout: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  rolActual = undefined;
  llamadas.adjuntos = llamadas.descarga = 0;
});
afterAll(() => server.close());

function servir(adjuntos: 'vacia' | 404 | 403 = 'vacia') {
  server.use(
    http.get(path('/viajes/:id/adjuntos'), () => {
      llamadas.adjuntos += 1;
      return adjuntos === 'vacia'
        ? HttpResponse.json({ items: [], cursor_siguiente: null })
        : HttpResponse.json({ codigo: 'error' }, { status: adjuntos });
    }),
    http.get(path('/viajes/:id/descarga'), () => {
      llamadas.descarga += 1;
      return HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 });
    }),
  );
}

function renderExpediente() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ExpedienteViaje id="VJ-1" />, { wrapper: Wrapper });
}

describe('quien tiene monitoreo.consultar', () => {
  it.each(['monitorista', 'supervisor', 'coordinador', 'administrador'])(
    '%s ve la descarga, la lista de evidencia y "Subir evidencia"',
    async (rol) => {
      rolActual = rol;
      servir();
      renderExpediente();
      expect(
        await screen.findByRole('button', { name: 'Descargar expediente' }),
      ).toBeInTheDocument();
      expect(await screen.findByText('Sin evidencia')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Subir evidencia' })).toBeInTheDocument();
    },
  );
});

describe('quien no la tiene', () => {
  it.each(['jefe_operativo', 'ejecutivo', 'reaccion', 'cotizacion'])(
    '%s ve "sin permiso" y no se pide la evidencia',
    async (rol) => {
      rolActual = rol;
      servir();
      renderExpediente();
      expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
      await new Promise((resolver) => setTimeout(resolver, 50));
      expect(llamadas).toEqual({ adjuntos: 0, descarga: 0 });
      expect(
        screen.queryByRole('button', { name: 'Descargar expediente' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Subir evidencia' })).not.toBeInTheDocument();
    },
  );
});

describe('errores (T2)', () => {
  it('un 404 de la lista dice "no encontrado" y no ofrece reintentar', async () => {
    rolActual = 'monitorista';
    servir(404);
    renderExpediente();
    expect(await screen.findByText('Viaje no encontrado.')).toBeInTheDocument();
    expect(screen.queryByText(/permiso|alcance/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('un 403 de la lista dice "sin permiso" y no ofrece reintentar', async () => {
    rolActual = 'monitorista';
    servir(403);
    renderExpediente();
    expect(
      await screen.findByText('No tienes permiso para ver la evidencia de este viaje.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('un 404 al descargar el expediente dice "no encontrado", sin hablar de alcance', async () => {
    rolActual = 'monitorista';
    servir();
    renderExpediente();
    fireEvent.click(await screen.findByRole('button', { name: 'Descargar expediente' }));
    expect(
      await screen.findByText('Viaje no encontrado. No hay expediente que descargar.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/alcance/i)).not.toBeInTheDocument();
  });
});
