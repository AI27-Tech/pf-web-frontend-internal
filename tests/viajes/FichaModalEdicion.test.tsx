import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
const guardadas: unknown[] = [];

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { rol: 'monitorista' },
    logout: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  guardadas.length = 0;
  restablecerCorte();
});
afterAll(() => server.close());

const detalle = {
  viaje: {
    id: 'VJ-20',
    estado: 'ASIGNADO',
    origen: 'Origen de prueba',
    destinos: [],
    creado_en: '2026-10-22T08:00:00.000Z',
  },
  condiciones_activas: [],
};

function usarSinFicha() {
  server.use(
    http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle)),
    http.get(path('/viajes/:id/ficha'), () =>
      HttpResponse.json({ codigo: 'no_encontrado', mensaje: 'sin ficha' }, { status: 404 }),
    ),
    http.get(path('/gps'), () => HttpResponse.json({ items: [], cursor_siguiente: null })),
    http.get(path('/viajes/:id/asignacion'), () =>
      HttpResponse.json({ viaje_id: 'VJ-20', unidades: [] }),
    ),
    http.patch(path('/viajes/:id/ficha'), async ({ request }) => {
      const cuerpo = await request.json();
      guardadas.push(cuerpo);
      return HttpResponse.json({
        viaje_id: 'VJ-20',
        tracto: { placas: 'ABC-1' },
        contenedores: [],
        gps_ids: [],
      });
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

describe('FichaTecnicaViaje: edición en modal', () => {
  it('conserva el borrador al cerrar sin guardar y lo muestra al reabrir', async () => {
    usarSinFicha();
    const user = userEvent.setup();
    renderFicha();

    await user.click(await screen.findByRole('button', { name: 'Capturar ficha' }));
    await user.type(await screen.findByLabelText('Placas'), 'XYZ-9');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardar ficha' })).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Capturar ficha' }));
    expect(await screen.findByLabelText('Placas')).toHaveValue('XYZ-9');
    expect(guardadas).toHaveLength(0);
  });

  it('al guardar envía el borrador, cierra el modal y avisa con un toast', async () => {
    usarSinFicha();
    const user = userEvent.setup();
    renderFicha();

    await user.click(await screen.findByRole('button', { name: 'Capturar ficha' }));
    await user.type(await screen.findByLabelText('Placas'), 'ABC-1');
    await user.click(screen.getByRole('button', { name: 'Guardar ficha' }));

    expect(await screen.findByText('Ficha técnica guardada.')).toBeInTheDocument();
    expect(guardadas).toEqual([expect.objectContaining({ tracto: { placas: 'ABC-1' } })]);
    expect(screen.queryByRole('button', { name: 'Guardar ficha' })).toBeNull();
  });
});
