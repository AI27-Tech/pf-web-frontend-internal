/**
 * Integración del dashboard de monitoreo con MSW (E8-T17, Bloque B, tarea 21).
 * `onUnhandledRequest: 'error'`: cualquier llamada no prevista falla la prueba.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { DashboardMonitoreo } from '@/features/monitoreo/dashboard/DashboardMonitoreo';
import { API_PREFIX } from '@/lib/constants';

const sesionFalsa = vi.hoisted(() => ({ rol: 'monitorista' as string }));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { rol: sesionFalsa.rol },
  }),
}));

// El enlace «Ver todos los viajes» usa el router. Aquí solo se verifica el texto.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/viajes">{children}</a>,
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
  sesionFalsa.rol = 'monitorista';
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

/** Trigger del Select de la barra de filtros con la etiqueta dada, por orden en la barra. */
function triggerFiltro(indice: number): HTMLElement {
  const triggers = screen.getAllByRole('button').filter((b) => b.className.includes('_trigger_'));
  const trigger = triggers[indice];
  if (!trigger) throw new Error(`no se encontró el filtro ${indice}`);
  return trigger;
}

describe('DashboardMonitoreo · acceso por rol', () => {
  it('un rol sin monitoreo ve el título y el mensaje, sin consultar el reporte', async () => {
    sesionFalsa.rol = 'jefe_operativo';
    renderDashboard();

    expect(
      await screen.findByRole('heading', { name: 'Dashboard de Monitoreo', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Este dashboard no está disponible para tu rol.')).toBeInTheDocument();
    expect(solicitudes).toEqual([]);
  });
});

describe('DashboardMonitoreo · vista en curso', () => {
  it('pide solo reporteViajes en_curso=true y muestra las KPI de tránsito y aprobados', async () => {
    renderDashboard();

    expect(await screen.findByRole('table', { name: 'Viajes del reporte' })).toBeInTheDocument();
    const kpis = screen.getByRole('group', { name: 'Indicadores de viajes en curso' });
    expect(within(kpis).getByText('Viajes en tránsito')).toBeInTheDocument();
    expect(within(kpis).getByText('Viajes aprobados')).toBeInTheDocument();

    expect(solicitudes).toEqual(['?en_curso=true']);
  });

  it('el filtro de estado deja solo los viajes de ese estado', async () => {
    renderDashboard();
    await screen.findByRole('table', { name: 'Viajes del reporte' });
    const user = userEvent.setup();

    await user.click(triggerFiltro(0));
    await user.click(screen.getByRole('button', { name: 'ASIGNADO' }));

    const tabla = screen.getByRole('table', { name: 'Viajes del reporte' });
    expect(within(tabla).getByText('VJ-A')).toBeInTheDocument();
    expect(within(tabla).getByText('VJ-C')).toBeInTheDocument();
    expect(within(tabla).queryByText('VJ-B')).not.toBeInTheDocument();
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
});
