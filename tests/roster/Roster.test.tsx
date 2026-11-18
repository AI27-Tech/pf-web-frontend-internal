/*
 * Sección /roster (E8-T21, DEC-142). Corre contra los handlers MSW de
 * `src/mocks/roster.ts`, que aplican las reglas del servidor (rol del JWT,
 * exclusividad, reserva vigente, validación), así que la prueba ejerce la forma
 * real de las respuestas y de los 409.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { Rol } from '@ai27-tech/contracts/roles';

import { Roster } from '@/features/roster/Roster';
import { API_PREFIX } from '@/lib/constants';
import { mockAccessToken } from '@/mocks/data';
import { handlersRoster, reiniciarRosterMock } from '@/mocks/roster';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer(...handlersRoster);
const logoutSpy = vi.fn();
let rolActual: Rol = Rol.JefeOperativo;
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
  rolActual = Rol.JefeOperativo;
  peticiones.length = 0;
  cuerpos.length = 0;
});
afterAll(() => server.close());

function renderRoster() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<Roster />, { wrapper: Wrapper });
}

async function abrirAlta() {
  await userEvent.click(await screen.findByRole('button', { name: 'Nueva unidad' }));
  return screen.findByRole('button', { name: 'Vehículo' });
}

async function elegirVehiculo(etiqueta: string) {
  await userEvent.click(await screen.findByRole('button', { name: 'Vehículo' }));
  await userEvent.click(await screen.findByRole('button', { name: etiqueta }));
}

async function crearUnidadCon(vehiculo: string, custodios: readonly string[]) {
  await abrirAlta();
  await elegirVehiculo(vehiculo);
  for (const nombre of custodios) {
    await userEvent.click(screen.getByRole('checkbox', { name: nombre }));
  }
  await userEvent.click(screen.getByRole('button', { name: 'Crear unidad' }));
}

describe('Roster — acceso', () => {
  it('el monitorista no entra: ve el aviso y no se pide el roster', async () => {
    rolActual = Rol.Monitorista;
    renderRoster();

    expect(
      await screen.findByText(
        'No tienes acceso al roster. Esta sección es del Jefe Operativo y del Administrador.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva unidad' })).toBeNull();
    expect(peticiones).toEqual([]);
  });

  it('un 403 del servidor se dice como falta de permiso y no cierra la sesión', async () => {
    server.use(
      http.get(path('/unidades'), () =>
        HttpResponse.json({ codigo: 'prohibido', mensaje: 'x' }, { status: 403 }),
      ),
    );
    renderRoster();

    expect(
      await screen.findByText('No tienes permiso para consultar el roster.'),
    ).toBeInTheDocument();
    expect(logoutSpy).not.toHaveBeenCalled();
  });
});

describe('Roster — lista', () => {
  it('muestra vehículo legible, custodios por nombre, tipo y estado', async () => {
    renderRoster();

    const tabla = await screen.findByRole('table', { name: 'Roster de unidades' });
    const filas = within(tabla).getAllByRole('row');
    expect(filas[1]).toHaveTextContent('P-101 · ABC-1234');
    expect(filas[1]).toHaveTextContent('Juan Pérez, Ana López');
    expect(filas[1]).toHaveTextContent('Patrulla');
    expect(filas[1]).toHaveTextContent('Activa');
    expect(filas[2]).toHaveTextContent('M-07 · XYZ-987');
    expect(filas[2]).toHaveTextContent('Moto');
    expect(filas[2]).toHaveTextContent('Inactiva');
  });

  it('pagina por cursor: la página siguiente pide el cursor recibido', async () => {
    const cursores: (string | null)[] = [];
    const unidad = (id: string, economico: string) => ({
      id,
      vehiculo_id: `V-${id}`,
      custodios_ids: ['C-1'],
      tipo: 'patrulla',
      activa: true,
      vehiculo: { economico },
      custodios: [{ id: 'C-1', nombre: 'Custodio Uno' }],
    });
    server.use(
      http.get(path('/unidades'), ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursores.push(cursor);
        return HttpResponse.json(
          cursor === 'c2'
            ? { items: [unidad('U-2', 'P-202')], cursor_siguiente: null }
            : { items: [unidad('U-1', 'P-201')], cursor_siguiente: 'c2' },
        );
      }),
    );
    renderRoster();

    expect(await screen.findByText('P-201')).toBeInTheDocument();
    // La tarjeta de Monitoristas lee el roster completo: se descuenta esa lectura.
    await screen.findByRole('table', { name: 'Unidades de cada Monitorista' });
    const antes = cursores.length;
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(await screen.findByText('P-202')).toBeInTheDocument();
    expect(screen.getByText('Página 2')).toBeInTheDocument();
    expect(cursores.slice(antes)).toEqual(['c2']);

    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(await screen.findByText('P-201')).toBeInTheDocument();
  });
});

/** La unidad recién creada cae en la última página del roster: avanza hasta encontrarla. */
async function irAFilaConTexto(texto: string): Promise<HTMLElement | null> {
  for (let pagina = 0; pagina < 5; pagina++) {
    const celda = await screen.findByText(texto, {}, { timeout: 500 }).catch(() => null);
    if (celda) return celda.closest('tr');
    await userEvent.click(await screen.findByRole('button', { name: 'Página siguiente' }));
  }
  throw new Error(`No apareció la fila: ${texto}`);
}

describe('Roster — alta', () => {
  it('alta feliz: elige vehículo y custodio; el tipo lo deriva el servidor', async () => {
    renderRoster();

    await crearUnidadCon('P-102 · DEF-5678 (coche)', ['María Torres']);

    expect(await screen.findByText('Unidad creada.')).toBeInTheDocument();
    const fila = await irAFilaConTexto('P-102 · DEF-5678');
    expect(fila).toHaveTextContent('María Torres');
    expect(fila).toHaveTextContent('Patrulla');
    expect(fila).toHaveTextContent('Activa');
    expect(cuerpos).toEqual([{ vehiculo_id: 'VEH-2003', custodios_ids: ['CUS-3004'] }]);
  });

  it('solo ofrece vehículos y custodios activos', async () => {
    renderRoster();
    await abrirAlta();

    await userEvent.click(screen.getByRole('button', { name: 'Vehículo' }));
    expect(screen.queryByRole('button', { name: /P-090/ })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: 'Rosa Díaz' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Pedro Gómez' })).toBeInTheDocument();
  });

  it('una moto admite un solo custodio y un coche hasta dos', async () => {
    renderRoster();
    await abrirAlta();

    await elegirVehiculo('M-07 · XYZ-987 (moto)');
    await userEvent.click(screen.getByRole('checkbox', { name: 'María Torres' }));
    expect(screen.getByRole('checkbox', { name: 'Pedro Gómez' })).toBeDisabled();

    // El selector ya muestra la moto: se abre por su etiqueta, que es su nombre accesible.
    await userEvent.click(screen.getByRole('button', { name: 'Vehículo' }));
    await userEvent.click(await screen.findByRole('button', { name: 'P-102 · DEF-5678 (coche)' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Pedro Gómez' }));
    expect(screen.getByRole('checkbox', { name: 'Juan Pérez' })).toBeDisabled();
  });

  it('409 vehiculo_en_otra_unidad: dice que el vehículo ya está en otra unidad activa', async () => {
    renderRoster();
    await crearUnidadCon('P-101 · ABC-1234 (coche)', ['Pedro Gómez']);

    expect(
      await screen.findByText(
        'El vehículo ya está en otra unidad activa. Elige otro vehículo o desactiva primero esa unidad.',
      ),
    ).toBeInTheDocument();
    // El formulario conserva la captura para corregirla.
    expect(screen.getByRole('checkbox', { name: 'Pedro Gómez' })).toBeChecked();
  });

  it('409 custodio_en_otra_unidad: dice que un custodio ya está en otra unidad activa', async () => {
    renderRoster();
    await crearUnidadCon('P-102 · DEF-5678 (coche)', ['Juan Pérez']);

    expect(
      await screen.findByText(
        'Un custodio elegido ya está en otra unidad activa. Elige otro custodio o desactiva primero esa unidad.',
      ),
    ).toBeInTheDocument();
  });

  it('400 de validación: lo dice sin culpar a la red', async () => {
    server.use(
      http.post(path('/unidades'), () =>
        HttpResponse.json({ codigo: 'validacion', mensaje: 'x' }, { status: 400 }),
      ),
    );
    renderRoster();
    await crearUnidadCon('P-102 · DEF-5678 (coche)', ['María Torres']);

    expect(await screen.findByText(/El servicio rechazó la unidad/)).toBeInTheDocument();
  });

  it('403 al crear: falta de permiso, sin cerrar la sesión', async () => {
    server.use(
      http.post(path('/unidades'), () =>
        HttpResponse.json({ codigo: 'prohibido', mensaje: 'x' }, { status: 403 }),
      ),
    );
    renderRoster();
    await crearUnidadCon('P-102 · DEF-5678 (coche)', ['María Torres']);

    expect(await screen.findByText('No tienes permiso para armar el roster.')).toBeInTheDocument();
    expect(logoutSpy).not.toHaveBeenCalled();
  });
});

describe('Roster — edición', () => {
  it('409 unidad_con_reserva_vigente: pide reasignar primero la escolta del viaje', async () => {
    renderRoster();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar unidad P-101 · ABC-1234' }),
    );
    await userEvent.click(await screen.findByRole('switch', { name: 'Unidad activa' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText(
        'La unidad está reservada en un viaje en curso. Primero reasigna la escolta de ese viaje y después edita o desactiva la unidad.',
      ),
    ).toBeInTheDocument();
  });

  it('reactiva una unidad inactiva y la lista la refleja', async () => {
    renderRoster();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar unidad M-07 · XYZ-987' }),
    );
    const activa = await screen.findByRole('switch', { name: 'Unidad activa' });
    expect(activa).not.toBeChecked();
    await userEvent.click(activa);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Unidad actualizada.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('M-07 · XYZ-987').closest('tr')).toHaveTextContent('Activa'),
    );
    expect(screen.getByText('M-07 · XYZ-987').closest('tr')).not.toHaveTextContent('Inactiva');
  });

  it('sin cambios no se puede guardar', async () => {
    renderRoster();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar unidad M-07 · XYZ-987' }),
    );
    expect(await screen.findByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });
});

describe('Roster — unidades de cada Monitorista', () => {
  async function filaDe(nombre: string) {
    const tabla = await screen.findByRole('table', { name: 'Unidades de cada Monitorista' });
    const fila = within(tabla).getByText(nombre).closest('tr');
    if (!fila) throw new Error(`sin fila para ${nombre}`);
    return fila;
  }

  it('lista los Monitoristas activos con sus unidades legibles, no como id', async () => {
    renderRoster();

    expect(await filaDe('Laura Méndez')).toHaveTextContent('P-101 · ABC-1234');
    expect(await filaDe('Laura Méndez')).not.toHaveTextContent('UN-1001');
    // Sin nombre: se muestra su identificador de usuario.
    expect(await filaDe('monitorista.dos@ai27.mx')).toHaveTextContent('Sin unidades');
    const tabla = screen.getByRole('table', { name: 'Unidades de cada Monitorista' });
    expect(within(tabla).queryByText('Óscar Ruiz')).toBeNull();
    expect(within(tabla).queryByText('Carmen Vega')).toBeNull();
  });

  it('pide solo Monitoristas activos y recorre todas las páginas', async () => {
    const consultas: string[] = [];
    const usuario = (id: string, nombre: string) => ({
      id,
      nombre,
      activo: true,
      es_propio: false,
    });
    server.use(
      http.get(path('/sujetos'), ({ request }) => {
        const query = new URL(request.url).searchParams;
        consultas.push(query.toString());
        return HttpResponse.json(
          query.get('cursor') === 'p2'
            ? { items: [usuario('SUJ-4002', 'Segunda Página')], cursor_siguiente: null }
            : { items: [usuario('SUJ-4001', 'Primera Página')], cursor_siguiente: 'p2' },
        );
      }),
    );
    renderRoster();

    expect(await filaDe('Primera Página')).toBeInTheDocument();
    expect(await filaDe('Segunda Página')).toBeInTheDocument();
    expect(consultas).toEqual([
      'rol=monitorista&activo=true',
      'rol=monitorista&activo=true&cursor=p2',
    ]);
  });

  it('sin Monitoristas activos lo dice', async () => {
    server.use(
      http.get(path('/sujetos'), () => HttpResponse.json({ items: [], cursor_siguiente: null })),
    );
    renderRoster();

    expect(await screen.findByText('No hay Monitoristas activos.')).toBeInTheDocument();
  });

  it('un 403 al listar se dice como falta de permiso y no cierra la sesión', async () => {
    server.use(
      http.get(path('/sujetos'), () =>
        HttpResponse.json({ codigo: 'prohibido', mensaje: 'x' }, { status: 403 }),
      ),
    );
    renderRoster();

    expect(
      await screen.findByText('No tienes permiso para consultar las unidades de los Monitoristas.'),
    ).toBeInTheDocument();
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('el diálogo envía el conjunto completo una sola vez y la lista se recarga', async () => {
    renderRoster();
    await crearUnidadCon('P-102 · DEF-5678 (coche)', ['María Torres']);
    await screen.findByText('Unidad creada.');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar unidades de Laura Méndez' }),
    );
    const dialogo = await screen.findByRole('dialog');
    // Solo activas: la moto inactiva UN-1002 no se ofrece.
    expect(within(dialogo).queryByRole('checkbox', { name: /M-07/ })).toBeNull();
    expect(within(dialogo).getByRole('checkbox', { name: 'P-101 · ABC-1234' })).toBeChecked();
    await userEvent.click(within(dialogo).getByRole('checkbox', { name: 'P-102 · DEF-5678' }));
    cuerpos.length = 0;
    await userEvent.dblClick(within(dialogo).getByRole('button', { name: 'Guardar unidades' }));

    expect(await screen.findByText('Unidades de Laura Méndez guardadas.')).toBeInTheDocument();
    expect(cuerpos).toEqual([{ unidades_ids: ['UN-1001', 'UN-N1'] }]);
    expect(peticiones.filter((p) => p.startsWith('PUT'))).toEqual([
      'PUT /api/v1/sujetos/SUJ-4001/alcance/unidades',
    ]);
    await waitFor(async () => expect(await filaDe('Laura Méndez')).toHaveTextContent('P-102'));
  });

  it('una unidad inactiva asignada se muestra marcada y se puede quitar', async () => {
    server.use(
      http.get(path('/sujetos/SUJ-4002/alcance'), () =>
        HttpResponse.json({
          unidades_ids: ['UN-1002'],
          subordinados_ids: [],
          unidades_efectivas_ids: ['UN-1002'],
        }),
      ),
    );
    renderRoster();

    const fila = await filaDe('monitorista.dos@ai27.mx');
    expect(fila).toHaveTextContent('M-07 · XYZ-987');
    expect(fila).toHaveTextContent('Inactiva');
    await userEvent.click(
      screen.getByRole('button', { name: 'Editar unidades de monitorista.dos@ai27.mx' }),
    );
    const inactiva = await screen.findByRole('checkbox', { name: 'M-07 · XYZ-987 (inactiva)' });
    expect(inactiva).toBeChecked();
    await userEvent.click(inactiva);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar unidades' }));

    await screen.findByText('Unidades de monitorista.dos@ai27.mx guardadas.');
    expect(cuerpos).toEqual([{ unidades_ids: [] }]);
  });

  it.each([
    [
      'rol_sin_alcance',
      'El usuario ya no es Monitorista y no puede tener unidades asignadas. Recarga la lista.',
    ],
    ['sujeto_desactivado', 'El Monitorista está desactivado. Recarga la lista.'],
  ])('409 %s al guardar: lo dice y conserva la selección', async (codigo, texto) => {
    server.use(
      http.put(path('/sujetos/:id/alcance/unidades'), () =>
        HttpResponse.json({ codigo, mensaje: 'x' }, { status: 409 }),
      ),
    );
    renderRoster();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar unidades de Laura Méndez' }),
    );
    await userEvent.click(await screen.findByRole('checkbox', { name: 'P-101 · ABC-1234' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar unidades' }));

    expect(await screen.findByText(texto)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'P-101 · ABC-1234' })).not.toBeChecked();
  });

  it('403 al guardar: falta de permiso, sin cerrar la sesión', async () => {
    server.use(
      http.put(path('/sujetos/:id/alcance/unidades'), () =>
        HttpResponse.json({ codigo: 'prohibido', mensaje: 'x' }, { status: 403 }),
      ),
    );
    renderRoster();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar unidades de Laura Méndez' }),
    );
    await userEvent.click(await screen.findByRole('checkbox', { name: 'P-101 · ABC-1234' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar unidades' }));

    expect(
      await screen.findByText('No tienes permiso para asignar unidades a los Monitoristas.'),
    ).toBeInTheDocument();
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('el administrador también asigna unidades', async () => {
    rolActual = Rol.Administrador;
    renderRoster();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar unidades de monitorista.dos@ai27.mx' }),
    );
    await userEvent.click(await screen.findByRole('checkbox', { name: 'P-101 · ABC-1234' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar unidades' }));

    await screen.findByText('Unidades de monitorista.dos@ai27.mx guardadas.');
    expect(cuerpos).toEqual([{ unidades_ids: ['UN-1001'] }]);
    // Una unidad puede estar en varios Monitoristas (DEC-145 #1).
    expect(await filaDe('Laura Méndez')).toHaveTextContent('P-101 · ABC-1234');
    expect(await filaDe('monitorista.dos@ai27.mx')).toHaveTextContent('P-101 · ABC-1234');
  });
});
