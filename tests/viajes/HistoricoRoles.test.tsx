/*
 * M6 · Histórico por rol (spec `afinacion-roles-modulo-a-modulo`, Requirement 7).
 *
 * Cubren: JO en solo lectura (ve bitácora, estadías e incidencias; sin gestos de escritura),
 * MON con escritura pero sin resolver, SUP, COO y ADM con corrección de incidencias, y el
 * `403` y `404` de una acción (T2.3, T2.4).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { HistoricoViaje } from '@/features/viajes/historico/HistoricoViaje';
import { API_PREFIX } from '@/lib/constants';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();
const navigateSpy = vi.fn();
let rolActual: string | undefined;

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: rolActual ? { id: 'u-1', rol: rolActual } : null,
  }),
}));

vi.mock('@tanstack/react-router', async () => {
  const { createElement } = await import('react');
  return {
    useNavigate: () => navigateSpy,
    Link: ({ to, children }: { to: string; children?: unknown }) =>
      createElement('a', { href: to }, children as never),
  };
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  navigateSpy.mockReset();
  rolActual = undefined;
});
afterAll(() => server.close());

const pagina = (items: unknown[]) => ({ items, cursor_siguiente: null });

/** Un viaje con una nota, una estadía abierta y una incidencia en atención. */
function servirConDatos() {
  server.use(
    http.get(path('/viajes/:id/bitacora'), () =>
      HttpResponse.json(
        pagina([
          {
            id: 'BIT-1',
            viaje_id: 'VJ-1',
            texto: 'Salida de la caseta',
            autor: 'Operador demo',
            ts: '2026-10-29T10:00:00.000Z',
          },
        ]),
      ),
    ),
    http.get(path('/viajes/:id/estadias'), () =>
      HttpResponse.json(
        pagina([
          {
            id: 'EST-1',
            viaje_id: 'VJ-1',
            motivo: 'carga',
            eje_autorizacion: 'autorizada',
            inicio: '2026-10-29T10:00:00.000Z',
            cierre: null,
          },
        ]),
      ),
    ),
    http.get(path('/viajes/:id/incidencias'), () =>
      HttpResponse.json(
        pagina([
          {
            id: 'INC-1',
            viaje_id: 'VJ-1',
            tipo_interno: 'falla_mecanica',
            estado: 'en_atencion',
            abierta_en: '2026-10-29T10:00:00.000Z',
            resuelta_en: null,
          },
        ]),
      ),
    ),
  );
}

function renderHistorico() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<HistoricoViaje id="VJ-1" />, { wrapper: Wrapper });
}

const MONITOREO = ['monitorista', 'supervisor', 'coordinador'] as const;

describe('JO ve el histórico en solo lectura', () => {
  it('lee bitácora, estadías e incidencias y no ve ningún gesto de escritura', async () => {
    rolActual = 'jefe_operativo';
    servirConDatos();
    renderHistorico();
    expect(await screen.findByText('Salida de la caseta')).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Estadías del viaje' })).toBeInTheDocument();
    expect(await screen.findByText('falla_mecanica')).toBeInTheDocument();
    for (const nombre of [
      'Nueva nota',
      'Marcar incidencia',
      'Abrir estadía',
      'Cerrar',
      'Resolver incidencia',
    ]) {
      expect(screen.queryByRole('button', { name: nombre })).not.toBeInTheDocument();
    }
  });
});

describe('escritura de MON, SUP, COO y ADM', () => {
  it.each([...MONITOREO, 'administrador'])(
    '%s registra notas, abre incidencias y opera estadías',
    async (rol) => {
      rolActual = rol;
      servirConDatos();
      renderHistorico();
      expect(await screen.findByRole('button', { name: 'Nueva nota' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Marcar incidencia' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Abrir estadía' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    },
  );
});

describe('corrección de incidencias', () => {
  it.each(['supervisor', 'coordinador', 'administrador'])(
    '%s ve "Resolver incidencia"',
    async (rol) => {
      rolActual = rol;
      servirConDatos();
      renderHistorico();
      expect(
        await screen.findByRole('button', { name: 'Resolver incidencia' }),
      ).toBeInTheDocument();
    },
  );

  it('el monitorista no la ve', async () => {
    rolActual = 'monitorista';
    servirConDatos();
    renderHistorico();
    await screen.findByText('falla_mecanica');
    expect(screen.queryByRole('button', { name: 'Resolver incidencia' })).not.toBeInTheDocument();
  });
});

describe('errores (T2)', () => {
  it('un 403 al registrar una nota avisa con Toast de sin permiso', async () => {
    rolActual = 'monitorista';
    servirConDatos();
    server.use(
      http.post(path('/viajes/:id/bitacora'), () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
    );
    renderHistorico();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Nueva nota' }));
    await user.type(await screen.findByRole('textbox'), 'Una nota');
    await user.click(screen.getByRole('button', { name: 'Registrar nota' }));
    expect(
      await screen.findByText('No tienes permiso para esta acción en este viaje.'),
    ).toBeVisible();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('un 404 al registrar una nota dice "ya no está disponible" y vuelve a la lista', async () => {
    rolActual = 'monitorista';
    servirConDatos();
    server.use(
      http.post(path('/viajes/:id/bitacora'), () =>
        HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 }),
      ),
    );
    renderHistorico();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Nueva nota' }));
    await user.type(await screen.findByRole('textbox'), 'Una nota');
    await user.click(screen.getByRole('button', { name: 'Registrar nota' }));
    expect(await screen.findByText('Este viaje ya no está disponible.')).toBeVisible();
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith({ to: '/viajes' }));
  });

  it('un 404 al leer dice "no encontrado" sin hablar de permisos', async () => {
    rolActual = 'monitorista';
    server.use(
      http.get(path('/viajes/:id/bitacora'), () =>
        HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 }),
      ),
      http.get(path('/viajes/:id/estadias'), () =>
        HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 }),
      ),
      http.get(path('/viajes/:id/incidencias'), () =>
        HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 }),
      ),
    );
    renderHistorico();
    expect(await screen.findByText('Viaje no encontrado')).toBeInTheDocument();
    expect(screen.queryByText(/permiso|alcance/i)).not.toBeInTheDocument();
  });
});
