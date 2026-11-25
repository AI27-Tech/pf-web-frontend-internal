/*
 * M3 · Crear viaje por rol (spec `afinacion-roles-modulo-a-modulo`, Requirement 4).
 *
 * Usan el hook real y los handlers mock, que responden como el BFF: el token lleva el rol y
 * `GET /clientes` y `POST /viajes` responden `403` a quien no tiene la capacidad.
 *
 *   - JO y ADM abren la pantalla, cargan clientes y crean el viaje.
 *   - MON ve el acceso no autorizado y no se piden clientes ni unidades.
 *   - `403` al listar clientes o al crear se trata según Requirement T2.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { CrearViaje } from '@/features/viajes/crear/CrearViaje';
import { API_PREFIX } from '@/lib/constants';
import { reiniciarAlmacenMock } from '@/mocks/almacen-viajes';
import { mockAccessToken } from '@/mocks/data';
import { handlers } from '@/mocks/handlers';
import type { Rol } from '@/lib/contracts';

let rolActual: Rol = 'jefe_operativo';
const navigateSpy = vi.fn();

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    usuario: { id: 'usr-1', rol: rolActual, audiencia: 'Interno' },
    sesion: { accessToken: mockAccessToken(rolActual) },
    logout: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const server = setupServer(...handlers);
const path = (segmento: string) => `*${API_PREFIX}${segmento}`;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => reiniciarAlmacenMock());
afterEach(() => {
  server.resetHandlers();
  navigateSpy.mockReset();
  rolActual = 'jefe_operativo';
});
afterAll(() => server.close());

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<CrearViaje />, { wrapper: Wrapper });
}

type Usuario = ReturnType<typeof userEvent.setup>;

async function elegirOpcion(user: Usuario, etiqueta: string, opcion: string) {
  await user.click(screen.getByRole('button', { name: etiqueta }));
  await user.click(screen.getByRole('button', { name: opcion }));
}

/** Completa todos los obligatorios con el primer cliente del catálogo demo. */
async function completarFormulario(user: Usuario) {
  await user.click(await screen.findByRole('combobox', { name: 'Cliente' }));
  await user.click(await screen.findByText('Cliente Norte'));
  await user.type(screen.getByRole('textbox', { name: 'Origen' }), 'Origen 1');
  await user.type(screen.getByRole('textbox', { name: 'Destino final' }), 'Destino final 1');
  await elegirOpcion(user, 'Tipo de escolta', 'Patrulla');
  const fecha = screen.getByLabelText(/Fecha del servicio/);
  await user.click(fecha);
  await user.type(fecha, '20/11/2026');
  await user.tab();
  await user.click(screen.getByRole('textbox', { name: 'Horas' }));
  await user.keyboard('0930a');
}

describe('crear viaje: feliz', () => {
  it.each(['jefe_operativo', 'administrador'] as const)('%s crea el viaje', async (rol) => {
    rolActual = rol;
    const user = userEvent.setup();
    renderizar();

    await completarFormulario(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar creación' }));

    expect(await screen.findByText('Viaje creado correctamente.')).toBeInTheDocument();
    expect(screen.getByText('APROBADO')).toBeInTheDocument();
  });
});

describe('crear viaje: sin la capacidad', () => {
  it.each(['monitorista', 'supervisor', 'coordinador', 'ejecutivo', 'reaccion'] as const)(
    '%s ve el acceso no autorizado y no se piden clientes ni unidades',
    async (rol) => {
      rolActual = rol;
      const pedidas: string[] = [];
      server.events.on('request:start', ({ request }) =>
        pedidas.push(new URL(request.url).pathname),
      );
      renderizar();

      expect(
        screen.getByText(/disponible para los roles Jefe Operativo y Administrador/),
      ).toBeInTheDocument();
      await new Promise((r) => setTimeout(r, 50));
      expect(pedidas.filter((p) => p.endsWith('/clientes') || p.endsWith('/unidades'))).toEqual([]);
      server.events.removeAllListeners();
    },
  );
});

describe('crear viaje: 403', () => {
  it('403 al cargar los clientes: dice que falta permiso y no ofrece reintentar', async () => {
    rolActual = 'administrador';
    server.use(
      http.get(path('/clientes'), () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
    );
    renderizar();

    expect(
      await screen.findByText('No tienes permiso para ver el catálogo de clientes.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument();
  });

  it('403 al crear: avisa con un Toast y conserva lo capturado', async () => {
    rolActual = 'administrador';
    server.use(
      http.post(path('/viajes'), () => HttpResponse.json({ codigo: 'prohibido' }, { status: 403 })),
    );
    const user = userEvent.setup();
    renderizar();

    await completarFormulario(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar creación' }));

    expect(await screen.findByText('No tienes permiso para crear viajes.')).toBeInTheDocument();
    // La pantalla sigue intacta: el formulario y lo capturado no se pierden.
    expect(screen.getByRole('textbox', { name: 'Origen' })).toHaveValue('Origen 1');
    expect(screen.queryByText('Viaje creado correctamente.')).not.toBeInTheDocument();
  });

  it('404 al crear: dice que el recurso ya no está disponible, sin hablar de permisos', async () => {
    server.use(
      http.post(path('/viajes'), () =>
        HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    renderizar();

    await completarFormulario(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar creación' }));

    await waitFor(() =>
      expect(screen.getByText('El recurso solicitado ya no está disponible.')).toBeInTheDocument(),
    );
    expect(screen.queryByText(/permiso/i)).not.toBeInTheDocument();
  });
});
