/*
 * M8 · Dashboard de monitoreo por rol (spec `afinacion-roles-modulo-a-modulo`, Requirement 9).
 *
 * Cubren: apertura solo con `monitoreo.dashboard` para cada rol interno, sin llamadas al reporte
 * para los demás, la vista "En curso" por defecto (DT-10) y que el navegador no filtra por cliente.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { DashboardMonitoreo } from '@/features/monitoreo/dashboard/DashboardMonitoreo';
import { API_PREFIX } from '@/lib/constants';
import { puede } from '@/lib/permisos';
import { ROLES_INTERNOS } from '@/lib/permisos/roles';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();
const solicitudes: string[] = [];
let rolActual: string | undefined;

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: rolActual ? { id: 'u-1', rol: rolActual } : null,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/viajes">{children}</a>,
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  solicitudes.length = 0;
  rolActual = undefined;
});
afterAll(() => server.close());

const FILAS = [
  { viaje_id: 'VJ-A', estado: 'ASIGNADO', creado_en: '2026-11-04T06:00:00.000Z' },
  { viaje_id: 'VJ-B', estado: 'EN_TRANSITO', creado_en: '2026-11-04T07:00:00.000Z' },
];

function servir() {
  server.use(
    http.get(path('/reportes/viajes'), ({ request }) => {
      solicitudes.push(new URL(request.url).search);
      return HttpResponse.json({
        filas: FILAS,
        total: FILAS.length,
        proyeccion_al: '2026-11-04T10:00:00.000Z',
        stale: false,
      });
    }),
  );
}

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<DashboardMonitoreo />, { wrapper: Wrapper });
}

describe('acceso al dashboard por rol', () => {
  it.each(ROLES_INTERNOS)('%s: el dashboard coincide con la capacidad', async (rol) => {
    rolActual = rol;
    servir();
    renderDashboard();
    expect(
      await screen.findByRole('heading', { name: 'Dashboard de Monitoreo', level: 1 }),
    ).toBeInTheDocument();
    if (puede(rol, 'monitoreo.dashboard')) {
      expect(await screen.findByRole('table', { name: 'Viajes del reporte' })).toBeInTheDocument();
      expect(solicitudes.length).toBeGreaterThan(0);
    } else {
      expect(screen.getByText('Sin permiso')).toBeInTheDocument();
      await new Promise((resolver) => setTimeout(resolver, 50));
      expect(solicitudes).toHaveLength(0);
    }
  });

  it('los roles con acceso son monitorista, supervisor, coordinador y administrador', () => {
    const conAcceso = ROLES_INTERNOS.filter((rol) => puede(rol, 'monitoreo.dashboard'));
    expect([...conAcceso].sort()).toEqual(
      ['administrador', 'coordinador', 'monitorista', 'supervisor'].sort(),
    );
  });
});

describe('contenido del dashboard', () => {
  it('abre en "En curso" y no manda ni aplica filtro por cliente', async () => {
    rolActual = 'monitorista';
    servir();
    renderDashboard();
    await screen.findByRole('table', { name: 'Viajes del reporte' });
    expect(solicitudes[0]).toContain('en_curso=true');
    expect(solicitudes[0]).not.toMatch(/cliente/i);
    // Muestra lo que devuelve el bff, sin recortar filas en el navegador.
    expect(await screen.findByText('VJ-A')).toBeInTheDocument();
    expect(await screen.findByText('VJ-B')).toBeInTheDocument();
  });
});
