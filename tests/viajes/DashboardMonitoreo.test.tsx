/**
 * Integración del dashboard de monitoreo con MSW (E8-T17, Bloque B, tarea 21).
 * `onUnhandledRequest: 'error'`: cualquier llamada no prevista falla la prueba.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { DashboardMonitoreo } from '@/features/monitoreo/dashboard/DashboardMonitoreo';
import { API_PREFIX } from '@/lib/constants';

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { rol: 'monitorista' },
  }),
}));

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();
const solicitudes: string[] = [];

const FILAS = [
  { viaje_id: 'VJ-A', estado: 'ASIGNADO', creado_en: '2026-11-04T06:00:00.000Z' },
  { viaje_id: 'VJ-B', estado: 'EN_EMBARQUE', creado_en: '2026-11-04T07:00:00.000Z' },
  { viaje_id: 'VJ-C', estado: 'ASIGNADO', creado_en: '2026-11-03T18:00:00.000Z' },
];

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  solicitudes.length = 0;
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
    http.get(path('/reportes/estados'), ({ request }) => {
      solicitudes.push(`estados${new URL(request.url).search}`);
      return HttpResponse.json({
        conteos: [{ estado: 'ASIGNADO', conteo: 4, permanencia_promedio_seg: null }],
        proyeccion_al: '2026-11-04T10:00:00.000Z',
        stale: false,
      });
    }),
  );
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<DashboardMonitoreo />, { wrapper: Wrapper });
}

describe('DashboardMonitoreo · vista en curso (por defecto)', () => {
  it('pide solo reporteViajes en_curso=true, agrupa en curso por estado y no consulta reporteEstados', async () => {
    renderDashboard();

    expect(await screen.findByRole('table', { name: 'Viajes del reporte' })).toBeInTheDocument();
    const conteos = screen.getByRole('table', { name: 'Viajes en curso por estado' });
    expect(within(conteos).getByText('ASIGNADO')).toBeInTheDocument();
    expect(within(conteos).getByText('2')).toBeInTheDocument();
    expect(within(conteos).getByText('EN_EMBARQUE')).toBeInTheDocument();
    expect(within(conteos).getByText('1')).toBeInTheDocument();

    expect(solicitudes).toEqual(['?en_curso=true']);
    expect(screen.getByRole('button', { name: 'En curso' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('DashboardMonitoreo · vista por rango', () => {
  it('pide reporteViajes y reporteEstados con desde y hasta, sin en_curso, y presenta cambios de estado', async () => {
    renderDashboard();
    await screen.findByRole('table', { name: 'Viajes del reporte' });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Últimos 7 días' }));

    expect(await screen.findByText('Cambios de estado en el periodo')).toBeInTheDocument();
    const viajes = solicitudes.find((s) => s.startsWith('?desde'));
    const estados = solicitudes.find((s) => s.startsWith('estados'));
    expect(viajes).toBeDefined();
    expect(viajes).not.toContain('en_curso');
    expect(estados).toContain('desde=');
    expect(estados).toContain('hasta=');
    expect(screen.queryByText(/permanencia/i)).not.toBeInTheDocument();
  });
});

describe('DashboardMonitoreo · estados de la vista', () => {
  it('sin viajes muestra el mensaje de vacío', async () => {
    server.use(
      http.get(path('/reportes/viajes'), () =>
        HttpResponse.json({ filas: [], total: 0, proyeccion_al: null }),
      ),
    );
    renderDashboard();

    expect(await screen.findByText('Sin viajes para mostrar.')).toBeInTheDocument();
  });

  it('error muestra mensaje y reintento que recupera la vista', async () => {
    let intento = 0;
    server.use(
      http.get(path('/reportes/viajes'), () => {
        intento += 1;
        return intento === 1
          ? HttpResponse.json({ mensaje: 'falla' }, { status: 500 })
          : HttpResponse.json({ filas: FILAS, total: FILAS.length, proyeccion_al: null });
      }),
    );
    renderDashboard();

    expect(await screen.findByText('No se pudo cargar el dashboard.')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('table', { name: 'Viajes del reporte' })).toBeInTheDocument();
    expect(intento).toBe(2);
  });

  it('403 muestra autorización insuficiente y no muestra datos', async () => {
    server.use(
      http.get(path('/reportes/viajes'), () =>
        HttpResponse.json({ mensaje: 'prohibido' }, { status: 403 }),
      ),
    );
    renderDashboard();

    expect(
      await screen.findByText('No tienes autorización para ver este reporte.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Viajes del reporte' })).not.toBeInTheDocument();
  });

  it('una proyección atrasada se muestra con la marca de datos atrasados', async () => {
    server.use(
      http.get(path('/reportes/viajes'), () =>
        HttpResponse.json({
          filas: FILAS,
          total: FILAS.length,
          proyeccion_al: '2026-11-04T04:00:00.000Z',
          stale: true,
        }),
      ),
    );
    renderDashboard();

    await waitFor(() => expect(screen.getByText('Datos atrasados')).toBeInTheDocument());
  });
});
