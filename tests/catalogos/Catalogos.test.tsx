/*
 * Vehículos y custodios en /catalogos (adelanto de E8-T16, DEC-142 #6). Corre contra
 * los handlers MSW de `src/mocks/roster.ts`: leen Jefe Operativo y Administrador,
 * escribe solo el Administrador, y el vehículo no lleva cliente (DEC-143).
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { Rol } from '@ai27-tech/contracts/roles';

import { Catalogos } from '@/features/catalogos/Catalogos';
import { API_PREFIX } from '@/lib/constants';
import { mockAccessToken } from '@/mocks/data';
import { handlersRoster, reiniciarRosterMock } from '@/mocks/roster';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer(...handlersRoster);
const logoutSpy = vi.fn();
let rolActual: Rol = Rol.Administrador;
const peticiones: string[] = [];
const cuerpos: unknown[] = [];

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: mockAccessToken(rolActual) },
    usuario: { id: 'u1', rol: rolActual, audiencia: 'Interno' },
    logout: logoutSpy,
  }),
}));

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  server.events.on('request:start', async ({ request }) => {
    peticiones.push(`${request.method} ${new URL(request.url).pathname}`);
    if (request.method !== 'GET') cuerpos.push(await request.clone().json());
  });
});
afterEach(() => {
  server.resetHandlers();
  reiniciarRosterMock();
  logoutSpy.mockReset();
  rolActual = Rol.Administrador;
  peticiones.length = 0;
  cuerpos.length = 0;
});
afterAll(() => server.close());

function renderCatalogos() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<Catalogos />, { wrapper: Wrapper });
}

const filaDe = (texto: string) => screen.getByText(texto).closest('tr');

describe('Catálogos — acceso por rol', () => {
  it('el monitorista ve el aviso y no se piden vehículos ni custodios', async () => {
    rolActual = Rol.Monitorista;
    renderCatalogos();

    expect(
      await screen.findByText(
        'Vehículos y custodios solo están disponibles para el Jefe Operativo y el Administrador.',
      ),
    ).toBeInTheDocument();
    expect(peticiones).toEqual([]);
  });

  it('el Jefe Operativo lee las dos listas sin botones de alta ni edición', async () => {
    rolActual = Rol.JefeOperativo;
    renderCatalogos();

    expect(await screen.findByText('P-101')).toBeInTheDocument();
    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo vehículo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nuevo custodio' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Editar/ })).toBeNull();
  });
});

describe('Catálogos — vehículos', () => {
  it('lista tipo, económico, placas y estado', async () => {
    renderCatalogos();

    const tabla = await screen.findByRole('table', { name: 'Vehículos' });
    await within(tabla).findByText('P-090');
    expect(filaDe('P-090')).toHaveTextContent('GHI-0001');
    expect(filaDe('P-090')).toHaveTextContent('Coche');
    expect(filaDe('P-090')).toHaveTextContent('Inactiva');
    expect(filaDe('M-07')).toHaveTextContent('Moto');
  });

  it('alta feliz: tipo, económico y placas, sin cliente', async () => {
    renderCatalogos();
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo vehículo' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Moto' }));
    await userEvent.type(screen.getByLabelText('Económico'), 'M-09');
    await userEvent.type(screen.getByLabelText('Placas'), 'ZZZ-111');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar vehículo' }));

    expect(await screen.findByText('Vehículo creado.')).toBeInTheDocument();
    await waitFor(() => expect(filaDe('M-09')).toHaveTextContent('ZZZ-111'));
    expect(filaDe('M-09')).toHaveTextContent('Activa');
    expect(cuerpos).toEqual([
      { tipo: 'moto', estado: 'activa', economico: 'M-09', placas: 'ZZZ-111' },
    ]);
  });

  it('desactivar envía solo el estado y la lista lo refleja', async () => {
    renderCatalogos();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar vehículo P-102 · DEF-5678' }),
    );
    await userEvent.click(screen.getByRole('switch', { name: 'Vehículo activo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar vehículo' }));

    expect(await screen.findByText('Vehículo actualizado.')).toBeInTheDocument();
    await waitFor(() => expect(filaDe('P-102')).toHaveTextContent('Inactiva'));
    expect(cuerpos).toEqual([{ estado: 'inactiva' }]);
  });

  it('un 403 al guardar dice que solo el Administrador escribe y no cierra la sesión', async () => {
    server.use(
      http.post(path('/vehiculos'), () =>
        HttpResponse.json({ codigo: 'prohibido', mensaje: 'x' }, { status: 403 }),
      ),
    );
    renderCatalogos();
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo vehículo' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Coche' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar vehículo' }));

    expect(
      await screen.findByText(
        'No tienes permiso para dar de alta o editar vehículos. Solo el Administrador puede hacerlo.',
      ),
    ).toBeInTheDocument();
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('un 400 dice que se revise la captura', async () => {
    server.use(
      http.post(path('/vehiculos'), () =>
        HttpResponse.json({ codigo: 'validacion', mensaje: 'x' }, { status: 400 }),
      ),
    );
    renderCatalogos();
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo vehículo' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Coche' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar vehículo' }));

    expect(
      await screen.findByText('El servicio rechazó los datos del vehículo. Revisa la captura.'),
    ).toBeInTheDocument();
  });
});

describe('Catálogos — custodios', () => {
  it('lista nombre, teléfono y estado', async () => {
    renderCatalogos();

    await screen.findByRole('table', { name: 'Custodios' });
    await waitFor(() => expect(filaDe('Juan Pérez')).toHaveTextContent('+52 55 1000 0001'));
    expect(filaDe('Rosa Díaz')).toHaveTextContent('Inactivo');
  });

  it('alta feliz con nombre y teléfono', async () => {
    renderCatalogos();
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo custodio' }));
    await userEvent.type(screen.getByLabelText(/Nombre/), 'Carla Ruiz');
    await userEvent.type(screen.getByLabelText('Teléfono'), '+52 55 2000 0000');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar custodio' }));

    expect(await screen.findByText('Custodio creado.')).toBeInTheDocument();
    await waitFor(() => expect(filaDe('Carla Ruiz')).toHaveTextContent('Activo'));
    expect(cuerpos).toEqual([
      { nombre: 'Carla Ruiz', estado: 'activo', telefono: '+52 55 2000 0000' },
    ]);
  });

  it('el alta exige nombre', async () => {
    renderCatalogos();
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo custodio' }));
    expect(screen.getByRole('button', { name: 'Guardar custodio' })).toBeDisabled();
  });
});
