import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { FichaTecnicaViaje } from '@/features/viajes/ficha/FichaTecnicaViaje';
import { mensajeErrorGuardarFicha } from '@/features/viajes/ficha/adaptadorFichaTecnica';
import { ApiError } from '@/lib/api/errors';
import { restablecerCorte } from '@/lib/api/sessionCut';
import { API_PREFIX } from '@/lib/constants';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();
const logoutSpy = vi.fn();
const navigateSpy = vi.fn();

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { rol: 'monitorista' },
    logout: logoutSpy,
  }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateSpy }));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  logoutSpy.mockReset();
  navigateSpy.mockReset();
  restablecerCorte();
});
afterAll(() => server.close());

function detalle() {
  return {
    viaje: {
      id: 'VJ-20',
      estado: 'ASIGNADO',
      origen: 'Origen de prueba',
      destinos: [
        { nombre: 'Destino 1', numero_envio: 'ENV-1', arribo: true },
        { nombre: 'Destino 2', numero_envio: 'ENV-2' },
      ],
      tipo_servicio: 'Custodia simple',
      creado_en: '2026-10-22T08:00:00.000Z',
    },
    condiciones_activas: [],
  };
}

function roster(
  items = [
    {
      id: 'UN-1',
      vehiculo_id: 'VEH-1',
      custodios_ids: ['CUS-1', 'CUS-2'],
      tipo: 'patrulla',
      activa: true,
    },
  ],
) {
  return { items, cursor_siguiente: null };
}

function handlersBase() {
  return [
    http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle())),
    http.get(path('/viajes/:id/ficha'), () =>
      HttpResponse.json({ viaje_id: 'VJ-20', contenedores: [], gps_ids: [] }),
    ),
    http.get(path('/gps'), () => HttpResponse.json({ items: [], cursor_siguiente: null })),
    http.get(path('/unidades'), () => HttpResponse.json(roster())),
  ];
}

function renderFicha() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<FichaTecnicaViaje id="VJ-20" />, { wrapper: Wrapper });
}

describe('FichaTecnicaViaje — lectura y escolta', () => {
  it('muestra la escolta derivada en solo lectura, sin recaptura de custodios', async () => {
    server.use(...handlersBase());
    renderFicha();

    expect(await screen.findByText('Escolta (derivada de la asignación)')).toBeInTheDocument();
    expect(await screen.findByText(/Unidad UN-1/)).toBeInTheDocument();
    expect(screen.getByText(/patrulla · VEH-1 · CUS-1, CUS-2/)).toBeInTheDocument();
    expect(screen.getByText(/no se recapturan custodios ni patrullas/i)).toBeInTheDocument();

    // No hay controles de edición de la escolta (solo lectura).
    expect(
      screen.queryByRole('button', { name: /asignar|recapturar|quitar custodio/i }),
    ).toBeNull();
  });

  it('conserva el orden de los destinos en lectura y marca el arribo', async () => {
    server.use(...handlersBase());
    renderFicha();

    const items = await screen.findAllByRole('listitem');
    const destinos = items.filter((li) => /Destino [12]/.test(li.textContent ?? ''));
    expect(destinos[0]?.textContent).toContain('Destino 1');
    expect(destinos[0]?.textContent).toContain('arribó');
    expect(destinos[1]?.textContent).toContain('Destino 2');
  });

  it('no presenta campos excluidos de V1 en el DOM', async () => {
    server.use(...handlersBase());
    renderFicha();

    await screen.findByText(/Unidad UN-1/);
    expect(
      screen.queryByText(/cuenta espejo|clave_amago|kit de seguridad|posición|señal/i),
    ).toBeNull();
  });

  it('muestra un estado de escolta vacía diferenciado', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle())),
      http.get(path('/viajes/:id/ficha'), () =>
        HttpResponse.json({ viaje_id: 'VJ-20', contenedores: [], gps_ids: [] }),
      ),
      http.get(path('/gps'), () => HttpResponse.json({ items: [], cursor_siguiente: null })),
      http.get(path('/unidades'), () => HttpResponse.json(roster([]))),
    );
    renderFicha();

    expect(
      await screen.findByText('No hay unidades en la escolta de este viaje.'),
    ).toBeInTheDocument();
  });

  it('ofrece reintentar cuando la escolta falla, sin inventar datos', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle())),
      http.get(path('/viajes/:id/ficha'), () =>
        HttpResponse.json({ viaje_id: 'VJ-20', contenedores: [], gps_ids: [] }),
      ),
      http.get(path('/gps'), () => HttpResponse.json({ items: [], cursor_siguiente: null })),
      http.get(path('/unidades'), () => HttpResponse.json({ mensaje: 'falla' }, { status: 500 })),
    );
    renderFicha();

    await waitFor(() =>
      expect(screen.getByText('No se pudo cargar la escolta.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Reintentar escolta' })).toBeInTheDocument();
  });
});

describe('FichaTecnicaViaje — un 403 no cierra la sesión', () => {
  const prohibido = () =>
    HttpResponse.json(
      { codigo: 'prohibido', mensaje: 'el rol monitorista no puede invocar listarUnidades' },
      { status: 403 },
    );

  it('un 403 en la escolta deja la ficha a la vista y avisa la falta de permiso', async () => {
    server.use(http.get(path('/unidades'), prohibido), ...handlersBase());
    renderFicha();

    expect(
      await screen.findByText('No tienes permiso para consultar la escolta de este viaje.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ficha técnica del viaje')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar escolta' })).toBeNull();
    expect(logoutSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('un 403 en el detalle muestra el aviso de permiso sin cerrar la sesión', async () => {
    server.use(http.get(path('/viajes/:id/detalle'), prohibido), ...handlersBase());
    renderFicha();

    expect(
      await screen.findByText('No tienes permiso para ver la ficha técnica de este viaje.'),
    ).toBeInTheDocument();
    expect(logoutSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('un 401 sigue cerrando la sesión y lleva a /login', async () => {
    // MSW resuelve con el primer handler que casa: el override va antes de la base.
    server.use(
      http.get(path('/viajes/:id/detalle'), () => new HttpResponse(null, { status: 401 })),
      ...handlersBase(),
    );
    renderFicha();

    await waitFor(() => expect(logoutSpy).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ to: '/login' })),
    );
  });

  it('el guardado distingue la falta de permiso de la sesión vencida', () => {
    expect(mensajeErrorGuardarFicha(new ApiError('prohibido', 'x', 403))).toBe(
      'No tienes permiso para guardar la ficha técnica.',
    );
    expect(mensajeErrorGuardarFicha(new ApiError('noAutorizado', 'x', 401))).toBe(
      'Tu sesión ya no es válida. Vuelve a iniciar sesión.',
    );
  });
});
