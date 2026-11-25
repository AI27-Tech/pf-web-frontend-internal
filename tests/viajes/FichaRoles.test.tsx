/*
 * M5 · Ficha técnica por rol (spec `afinacion-roles-modulo-a-modulo`, Requirement 6).
 *
 * Cubren: EJE y REA sin permiso y sin llamadas (E7), JO en solo lectura (E4), edición para
 * MON, SUP, COO y ADM (E3), `unidades` vacío como "sin asignación", `404` del viaje y `403` al
 * guardar con Toast.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { FichaTecnicaViaje } from '@/features/viajes/ficha/FichaTecnicaViaje';
import { restablecerCorte } from '@/lib/api/sessionCut';
import { API_PREFIX } from '@/lib/constants';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();
const navigateSpy = vi.fn();
let rolActual: string | undefined;

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: rolActual ? { id: 'u-1', rol: rolActual } : null,
    logout: vi.fn(),
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

/** Peticiones de datos que llegaron al bff, por operación. */
const llamadas = { detalle: 0, ficha: 0, gps: 0, asignacion: 0 };

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  navigateSpy.mockReset();
  restablecerCorte();
  rolActual = undefined;
  llamadas.detalle = llamadas.ficha = llamadas.gps = llamadas.asignacion = 0;
});
afterAll(() => server.close());

const DETALLE = {
  viaje: {
    id: 'VJ-20',
    estado: 'ASIGNADO',
    origen: 'Origen de prueba',
    destinos: [],
    creado_en: '2026-10-22T08:00:00.000Z',
  },
  condiciones_activas: [],
};

const FICHA = {
  viaje_id: 'VJ-20',
  tracto: { placas: 'ABC-1' },
  contenedores: [],
  gps_ids: [],
};

/** Sirve las cuatro lecturas de la pantalla y cuenta cada una. */
function servir(opciones: { ficha?: 'existe' | 'inexistente'; unidades?: unknown[] } = {}) {
  const { ficha = 'existe', unidades = [] } = opciones;
  server.use(
    http.get(path('/viajes/:id/detalle'), () => {
      llamadas.detalle += 1;
      return HttpResponse.json(DETALLE);
    }),
    http.get(path('/viajes/:id/ficha'), () => {
      llamadas.ficha += 1;
      return ficha === 'existe'
        ? HttpResponse.json(FICHA)
        : HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 });
    }),
    http.get(path('/gps'), () => {
      llamadas.gps += 1;
      return HttpResponse.json({ items: [], cursor_siguiente: null });
    }),
    http.get(path('/viajes/:id/asignacion'), () => {
      llamadas.asignacion += 1;
      return HttpResponse.json({ viaje_id: 'VJ-20', unidades });
    }),
  );
}

function renderFicha() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<FichaTecnicaViaje id="VJ-20" />, { wrapper: Wrapper });
}

describe('E7: ejecutivo y reacción no abren la ficha', () => {
  it.each(['ejecutivo', 'reaccion', 'cotizacion'])(
    '%s ve "sin permiso" y no se pide ficha, escolta ni detalle',
    async (rol) => {
      rolActual = rol;
      servir();
      renderFicha();
      expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
      // Margen para detectar una petición que se dispare después del primer render.
      await new Promise((resolver) => setTimeout(resolver, 50));
      expect(llamadas).toEqual({ detalle: 0, ficha: 0, gps: 0, asignacion: 0 });
    },
  );
});

describe('E4: el jefe operativo ve la ficha sin controles de edición', () => {
  it('con ficha: la lee y no ve "Editar ficha"', async () => {
    rolActual = 'jefe_operativo';
    servir();
    renderFicha();
    expect(await screen.findByText('Ficha técnica confirmada')).toBeInTheDocument();
    expect(await screen.findByText('ABC-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar ficha' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar ficha' })).not.toBeInTheDocument();
  });

  it('sin ficha: lo dice y no ofrece "Capturar ficha"', async () => {
    rolActual = 'jefe_operativo';
    servir({ ficha: 'inexistente' });
    renderFicha();
    expect(await screen.findByText('La ficha aún no existe para este viaje.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Capturar ficha' })).not.toBeInTheDocument();
  });
});

describe('E3: quien tiene viaje.ficha.editar edita', () => {
  it.each(['monitorista', 'supervisor', 'coordinador', 'administrador'])(
    '%s ve "Editar ficha" y abre el editor',
    async (rol) => {
      rolActual = rol;
      servir();
      renderFicha();
      const user = userEvent.setup();
      await user.click(await screen.findByRole('button', { name: 'Editar ficha' }));
      expect(await screen.findByRole('button', { name: 'Guardar ficha' })).toBeInTheDocument();
    },
  );

  it('administrador captura una ficha que no existe', async () => {
    rolActual = 'administrador';
    servir({ ficha: 'inexistente' });
    renderFicha();
    expect(await screen.findByRole('button', { name: 'Capturar ficha' })).toBeInTheDocument();
  });
});

describe('escolta y errores', () => {
  it('"unidades" vacío con 200 es "sin escolta asignada", no un error', async () => {
    rolActual = 'jefe_operativo';
    servir({ unidades: [] });
    renderFicha();
    expect(await screen.findByText('Este viaje no tiene escolta asignada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument();
  });

  it('un 404 del viaje dice "no encontrado" sin hablar de permisos', async () => {
    rolActual = 'monitorista';
    server.use(
      http.get(path('/viajes/:id/detalle'), () =>
        HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 }),
      ),
      http.get(path('/viajes/:id/ficha'), () =>
        HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 }),
      ),
      http.get(path('/gps'), () => HttpResponse.json({ items: [], cursor_siguiente: null })),
      http.get(path('/viajes/:id/asignacion'), () =>
        HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 }),
      ),
    );
    renderFicha();
    expect(await screen.findByText('Viaje no encontrado')).toBeInTheDocument();
    expect(screen.queryByText(/permiso|alcance/i)).not.toBeInTheDocument();
  });

  it('un 403 al guardar avisa con Toast y conserva el editor', async () => {
    rolActual = 'monitorista';
    servir();
    server.use(
      http.patch(path('/viajes/:id/ficha'), () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
    );
    renderFicha();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Editar ficha' }));
    await user.type(await screen.findByLabelText('Placas'), 'Z');
    await user.click(screen.getByRole('button', { name: 'Guardar ficha' }));
    const avisos = await screen.findAllByText('No tienes permiso para guardar la ficha técnica.');
    expect(avisos.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Guardar ficha' })).toBeInTheDocument();
  });
});
