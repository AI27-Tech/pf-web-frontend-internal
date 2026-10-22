import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { DetalleViaje } from '@/features/viajes/detalle/DetalleViaje';
import { API_PREFIX } from '@/lib/constants';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();
const logoutSpy = vi.fn();
const navigateSpy = vi.fn();

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({ sesion: { accessToken: 'token-de-prueba' }, logout: logoutSpy }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateSpy }));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  logoutSpy.mockReset();
  navigateSpy.mockReset();
});
afterAll(() => server.close());

function detalle(estado = 'APROBADO') {
  return {
    viaje: {
      id: 'VJ-10',
      estado,
      origen: 'Origen de prueba',
      destinos: [{ nombre: 'Destino de prueba', numero_envio: 'ENV-10' }],
      fecha_hora_servicio: '2026-10-22T10:00:00.000Z',
      creado_en: '2026-10-22T08:00:00.000Z',
    },
    condiciones_activas: [],
  };
}

function roster(
  items = [
    { id: 'UN-1', vehiculo_id: 'VEH-1', custodios_ids: ['CUS-1'], tipo: 'moto', activa: false },
  ],
) {
  return { items, cursor_siguiente: null };
}

function renderDetalle() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<DetalleViaje id="VJ-10" />, { wrapper: Wrapper });
}

describe('Asignación de escolta', () => {
  it('solo ofrece Asignar escolta cuando el viaje está APROBADO', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), ({ params }) =>
        HttpResponse.json(detalle(params.id === 'VJ-10' ? 'APROBADO' : 'SOLICITADO')),
      ),
    );
    renderDetalle();
    expect(await screen.findByRole('button', { name: 'Asignar escolta' })).toBeInTheDocument();

    cleanup();
    cleanup();
    server.resetHandlers();
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle('SOLICITADO'))),
    );
    // La derivación se cubre en una segunda instancia para no escribir una lista local.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <DetalleViaje id="VJ-10" />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Asignar escolta' })).not.toBeInTheDocument(),
    );
  });

  it('asigna una unidad inactiva sin bloquearla y refleja ASIGNADO', async () => {
    let estado = 'APROBADO';
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle(estado))),
      http.get(path('/unidades'), () => HttpResponse.json(roster())),
      http.post(path('/viajes/:id/asignacion'), async ({ request }) => {
        const body = (await request.json()) as { unidades_ids?: string[] };
        if (body.unidades_ids?.length) {
          estado = 'ASIGNADO';
          return HttpResponse.json({ viaje_id: 'VJ-10', unidades: [] });
        }
        return HttpResponse.json({ mensaje: 'vacía' }, { status: 400 });
      }),
    );
    renderDetalle();

    await userEvent.click(await screen.findByRole('button', { name: 'Asignar escolta' }));
    const checkboxes = await screen.findAllByRole('checkbox');
    await userEvent.click(checkboxes[1]!);
    await userEvent.click(screen.getByRole('button', { name: /Confirmar asignación/i }));

    await waitFor(() => expect(screen.getByText('ASIGNADO')).toBeInTheDocument());
    expect(screen.getByText('Escolta asignada correctamente')).toBeInTheDocument();
  });

  it('distingue roster vacío de una carrera 409', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle())),
      http.get(path('/unidades'), () => HttpResponse.json(roster([]))),
    );
    renderDetalle();
    await userEvent.click(await screen.findByRole('button', { name: 'Asignar escolta' }));
    expect(await screen.findByText('Sin unidades disponibles para asignar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar asignación/i })).toBeDisabled();

    cleanup();
    server.resetHandlers();
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle())),
      http.get(path('/unidades'), () => HttpResponse.json(roster())),
      http.post(path('/viajes/:id/asignacion'), () =>
        HttpResponse.json({ error: { codigo: 'recurso_no_disponible' } }, { status: 409 }),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <DetalleViaje id="VJ-10" />
      </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Asignar escolta' }));
    await userEvent.click((await screen.findAllByRole('checkbox'))[1]!);
    await userEvent.click(screen.getAllByRole('button', { name: /Confirmar asignación/i }).at(-1)!);

    expect(await screen.findByText(/otro operador reservó una unidad/i)).toBeInTheDocument();
    expect(screen.queryByText('Sin unidades disponibles para asignar.')).not.toBeInTheDocument();
  });
});
