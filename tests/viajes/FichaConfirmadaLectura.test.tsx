import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { FichaTecnicaViaje } from '@/features/viajes/ficha/FichaTecnicaViaje';
import { restablecerCorte } from '@/lib/api/sessionCut';
import { API_PREFIX } from '@/lib/constants';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();

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
  restablecerCorte();
});
afterAll(() => server.close());

const detalle = {
  viaje: {
    id: 'VJ-20',
    estado: 'ASIGNADO',
    origen: 'Origen de prueba',
    destinos: [{ nombre: 'Destino 1' }],
    creado_en: '2026-10-22T08:00:00.000Z',
  },
  condiciones_activas: [],
};

function usarFicha(ficha: object | null) {
  server.use(
    http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle)),
    http.get(path('/viajes/:id/ficha'), () =>
      ficha
        ? HttpResponse.json(ficha)
        : HttpResponse.json({ codigo: 'no_encontrado', mensaje: 'sin ficha' }, { status: 404 }),
    ),
    http.get(path('/gps'), () =>
      HttpResponse.json({
        items: [{ id: 'GPS-1', identificador: 'GPS-A', activo: true }],
        cursor_siguiente: null,
      }),
    ),
    http.get(path('/viajes/:id/asignacion'), () =>
      HttpResponse.json({ viaje_id: 'VJ-20', unidades: [] }),
    ),
  );
}

function renderFicha() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<FichaTecnicaViaje id="VJ-20" />, { wrapper: Wrapper });
}

describe('FichaTecnicaViaje: ficha confirmada en lectura', () => {
  it('muestra los valores capturados y el identificador legible del GPS', async () => {
    usarFicha({
      viaje_id: 'VJ-20',
      tracto: { placas: 'TRC-999', marca: 'Kenworth' },
      contenedores: [{ economico: 'CNT-1', sello: 'SELLO-77' }],
      gps_ids: ['GPS-1', 'GPS-DESCONOCIDO'],
    });
    renderFicha();

    expect(await screen.findByText('TRC-999')).toBeInTheDocument();
    expect(screen.getByText('Kenworth')).toBeInTheDocument();

    const tabla = screen.getByRole('table', { name: 'Contenedores de la ficha' });
    expect(within(tabla).getByText('CNT-1')).toBeInTheDocument();
    expect(within(tabla).getByText('SELLO-77')).toBeInTheDocument();

    // El editor oculto también lista el catálogo; se acota a la región visible.
    const gps = screen.getByRole('region', { name: 'GPS registrados (2)' });
    expect(await within(gps).findByText('GPS-A')).toBeInTheDocument();
    // Un id que ya no está en el catálogo activo se muestra tal cual.
    expect(within(gps).getByText('GPS-DESCONOCIDO')).toBeInTheDocument();
  });

  it('indica cada bloque vacío en lugar de mostrar solo cantidades', async () => {
    usarFicha({ viaje_id: 'VJ-20', contenedores: [], gps_ids: [] });
    renderFicha();

    expect(await screen.findByText('Sin tracto informado.')).toBeInTheDocument();
    expect(screen.getByText('Sin contenedores.')).toBeInTheDocument();
    expect(screen.getByText('Sin GPS registrados.')).toBeInTheDocument();
  });

  it('sin ficha ofrece capturarla y abre el editor', async () => {
    usarFicha(null);
    renderFicha();

    const boton = await screen.findByRole('button', { name: 'Capturar ficha' });
    expect(screen.queryByRole('button', { name: 'Guardar ficha' })).toBeNull();
    boton.click();
    expect(await screen.findByRole('button', { name: 'Guardar ficha' })).toBeInTheDocument();
  });
});
