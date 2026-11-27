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
import { listarClientesMock, mockAccessToken } from '@/mocks/data';
import { handlersRoster, reiniciarRosterMock } from '@/mocks/roster';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer(
  ...handlersRoster,
  http.get(path('/clientes'), ({ request }) =>
    HttpResponse.json(listarClientesMock(new URL(request.url).searchParams.get('cursor'))),
  ),
);
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
  return screen.findByRole('combobox', { name: 'Vehículo' });
}

async function elegirVehiculo(etiqueta: string) {
  await userEvent.click(await screen.findByRole('combobox', { name: 'Vehículo' }));
  await userEvent.click(await screen.findByRole('option', { name: etiqueta }));
}

/** Un clic en el botón del custodio lo elige o lo quita. */
/** Elige o quita un custodio: el chip lo quita; si no está elegido, se agrega desde el selector. */
async function alternarCustodio(nombre: string) {
  const quitar = screen.queryByRole('button', { name: `Quitar a ${nombre}` });
  if (quitar) {
    await userEvent.click(quitar);
    return;
  }
  await userEvent.click(screen.getByRole('combobox', { name: 'Agregar custodio' }));
  await userEvent.click(await screen.findByRole('option', { name: nombre }));
}

/** La fila del custodio en la tabla de custodios. */
/** Chip de un custodio elegido; si no está elegido, no existe. */
function botonCustodio(nombre: string): HTMLElement | null {
  return screen.queryByRole('button', { name: `Quitar a ${nombre}` });
}
async function crearUnidadCon(vehiculo: string, custodios: readonly string[]) {
  await abrirAlta();
  await elegirVehiculo(vehiculo);
  for (const nombre of custodios) {
    await alternarCustodio(nombre);
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
    await within(tabla).findByText('P-101 · ABC-1234');
    const filas = within(tabla).getAllByRole('row');
    expect(filas[1]).toHaveTextContent('P-101 · ABC-1234');
    expect(filas[1]).toHaveTextContent('Juan Pérez, Ana López');
    expect(filas[1]).toHaveTextContent('Patrulla');
    expect(filas[1]).toHaveTextContent('Activa');
    expect(filas[2]).toHaveTextContent('M-07 · XYZ-987');
    expect(filas[2]).toHaveTextContent('Moto');
    expect(filas[2]).toHaveTextContent('Inactiva');
  });

  it('muestra el cliente de cada unidad; sin cliente lo dice, y uno desactivado va por id y marcado', async () => {
    const unidad = (id: string, economico: string, clienteId: string | null) => ({
      id,
      vehiculo_id: `V-${id}`,
      custodios_ids: ['C-1'],
      tipo: 'patrulla',
      activa: true,
      vehiculo: { economico },
      custodios: [{ id: 'C-1', nombre: 'Custodio Uno' }],
      cliente_id: clienteId,
    });
    server.use(
      http.get(path('/unidades'), () =>
        HttpResponse.json({
          items: [
            unidad('U-1', 'P-301', 'CLI-1001'),
            unidad('U-2', 'P-302', null),
            unidad('U-3', 'P-303', 'CLI-9999'),
          ],
          cursor_siguiente: null,
        }),
      ),
    );
    renderRoster();

    const tabla = await screen.findByRole('table', { name: 'Roster de unidades' });
    await within(tabla).findByText('P-301');
    const filas = within(tabla).getAllByRole('row');
    expect(filas[1]).toHaveTextContent('Cliente Norte');
    expect(filas[2]).toHaveTextContent('Sin cliente');
    expect(filas[3]).toHaveTextContent('CLI-9999');
    expect(filas[3]).toHaveTextContent('Desactivado');
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
    await screen.findByRole('table', { name: 'Clientes de cada Monitorista' });
    const antes = cursores.length;
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('P-202')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    expect(cursores.slice(antes)).toEqual(['c2']);

    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(await screen.findByText('P-201')).toBeInTheDocument();
  });
});

/** La unidad recién creada cae en la última página del roster: avanza hasta encontrarla. */
async function irAFilaConTexto(texto: string): Promise<HTMLElement | null> {
  for (let pagina = 0; pagina < 5; pagina++) {
    const celda = await screen.findByText(texto, {}, { timeout: 500 }).catch(() => null);
    if (celda) return celda.closest('tr');
    await userEvent.click(await screen.findByRole('button', { name: 'Next page' }));
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

    await userEvent.click(screen.getByRole('combobox', { name: 'Vehículo' }));
    expect(screen.queryByRole('button', { name: /P-090/ })).toBeNull();
    await elegirVehiculo('P-102 · DEF-5678 (coche)');
    await userEvent.click(screen.getByRole('combobox', { name: 'Agregar custodio' }));
    expect(screen.queryByRole('option', { name: 'Rosa Díaz' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Pedro Gómez' })).toBeInTheDocument();
  });

  it('una moto admite un solo custodio y un coche hasta dos', async () => {
    renderRoster();
    await abrirAlta();

    await elegirVehiculo('M-07 · XYZ-987 (moto)');
    await alternarCustodio('María Torres');
    // Con moto, elegir otro custodio reemplaza al anterior.
    await alternarCustodio('Pedro Gómez');
    expect(botonCustodio('Pedro Gómez')).toBeInTheDocument();
    expect(botonCustodio('María Torres')).toBeNull();

    // Con un coche, hasta dos; un tercero se rechaza con aviso.
    await elegirVehiculo('P-102 · DEF-5678 (coche)');
    await alternarCustodio('Juan Pérez');
    await alternarCustodio('María Torres');
    expect(await screen.findByText(/lleva hasta 2/)).toBeInTheDocument();
    expect(botonCustodio('María Torres')).toBeNull();
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
    expect(botonCustodio('Pedro Gómez')).toBeInTheDocument();
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
  it('409 unidad_con_reserva_vigente: explica el rechazo sin ofrecer reasignar la escolta', async () => {
    renderRoster();
    await userEvent.click(
      await screen.findByRole('link', { name: 'Editar unidad P-101 · ABC-1234' }),
    );
    await userEvent.click(await screen.findByRole('switch', { name: 'Unidad activa' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText(
        'La unidad está reservada en un viaje que aún no termina, así que no se puede editar ni desactivar por ahora. Inténtalo cuando ese viaje termine.',
      ),
    ).toBeInTheDocument();
  });

  it('reactiva una unidad inactiva y la lista la refleja', async () => {
    renderRoster();
    await userEvent.click(
      await screen.findByRole('link', { name: 'Editar unidad M-07 · XYZ-987' }),
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
      await screen.findByRole('link', { name: 'Editar unidad M-07 · XYZ-987' }),
    );
    expect(await screen.findByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });
});

describe('Roster — clientes de cada Monitorista', () => {
  async function filaDe(nombre: string) {
    const tabla = await screen.findByRole('table', { name: 'Clientes de cada Monitorista' });
    // La tabla se dibuja con su skeleton antes de tener filas: se espera al nombre.
    const fila = (await within(tabla).findByText(nombre)).closest('tr');
    if (!fila) throw new Error(`sin fila para ${nombre}`);
    return fila;
  }
  /** Alcance de SUJ-4002 con un cliente que ya no está entre los activos. */
  function conClienteDesactivado() {
    server.use(
      http.get(path('/sujetos/SUJ-4002/alcance'), () =>
        HttpResponse.json({
          clientes_ids: ['CLI-9009'],
          clientes_efectivos_ids: ['CLI-9009'],
          unidades_ids: [],
          subordinados_ids: [],
          unidades_efectivas_ids: [],
        }),
      ),
    );
  }

  it('lista los Monitoristas activos con el nombre de sus clientes, no como id', async () => {
    renderRoster();
    expect(await filaDe('Laura Méndez')).toHaveTextContent('Cliente Norte');
    expect(await filaDe('Laura Méndez')).not.toHaveTextContent('CLI-1001');
    // Sin nombre: se muestra su identificador de usuario.
    expect(await filaDe('monitorista.dos@ai27.mx')).toHaveTextContent('Sin clientes');
    const tabla = screen.getByRole('table', { name: 'Clientes de cada Monitorista' });
    expect(within(tabla).queryByText('Óscar Ruiz')).toBeNull();
    expect(within(tabla).queryByText('Carmen Vega')).toBeNull();
  });

  it('no pide organizaciones ni el alcance de la unidad: solo clientes activos', async () => {
    renderRoster();
    await filaDe('Laura Méndez');
    expect(peticiones.some((p) => p.includes('/organizaciones'))).toBe(false);
    expect(peticiones.filter((p) => p === 'GET /api/v1/clientes').length).toBeGreaterThan(0);
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
      await screen.findByText('No tienes permiso para consultar los clientes de los Monitoristas.'),
    ).toBeInTheDocument();
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  /** Quita un cliente con su chip o lo agrega desde el selector del diálogo. */
  async function marcarCliente(nombre: string) {
    const quitar = screen.queryByRole('button', { name: `Quitar a ${nombre}` });
    if (quitar) {
      await userEvent.click(quitar);
      return;
    }
    await userEvent.click(screen.getByRole('combobox', { name: 'Agregar cliente' }));
    await userEvent.click(await screen.findByRole('option', { name: nombre }));
  }

  it('E9: el diálogo ofrece solo clientes activos, envía el conjunto completo una vez y recarga', async () => {
    renderRoster();
    await userEvent.click(
      await screen.findByRole('link', { name: 'Editar clientes de Laura Méndez' }),
    );
    const dialogo = await screen.findByRole('dialog');
    expect(
      await within(dialogo).findByRole('button', { name: 'Quitar a Cliente Norte' }),
    ).toBeInTheDocument();
    await marcarCliente('Cliente Sur');
    cuerpos.length = 0;
    await userEvent.dblClick(within(dialogo).getByRole('button', { name: 'Guardar clientes' }));
    expect(await screen.findByText('Clientes de Laura Méndez guardados.')).toBeInTheDocument();
    expect(cuerpos).toEqual([{ clientes_ids: ['CLI-1001', 'CLI-1003'] }]);
    expect(peticiones.filter((p) => p.startsWith('PUT'))).toEqual([
      'PUT /api/v1/sujetos/SUJ-4001/alcance/clientes',
    ]);
    await waitFor(async () =>
      expect(await filaDe('Laura Méndez')).toHaveTextContent('Cliente Sur'),
    );
  });

  it('un cliente puede estar en varios Monitoristas', async () => {
    renderRoster();
    await userEvent.click(
      await screen.findByRole('link', { name: 'Editar clientes de monitorista.dos@ai27.mx' }),
    );
    await marcarCliente('Cliente Norte');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar clientes' }));
    await screen.findByText('Clientes de monitorista.dos@ai27.mx guardados.');
    expect(cuerpos).toEqual([{ clientes_ids: ['CLI-1001'] }]);
    expect(await filaDe('Laura Méndez')).toHaveTextContent('Cliente Norte');
    expect(await filaDe('monitorista.dos@ai27.mx')).toHaveTextContent('Cliente Norte');
  });

  it('E10: un cliente desactivado se muestra por su id, marcado, y se quita al guardar', async () => {
    conClienteDesactivado();
    renderRoster();
    const fila = await filaDe('monitorista.dos@ai27.mx');
    expect(fila).toHaveTextContent('CLI-9009');
    expect(fila).toHaveTextContent('Desactivado');
    await userEvent.click(
      screen.getByRole('link', { name: 'Editar clientes de monitorista.dos@ai27.mx' }),
    );
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText('CLI-9009 · Desactivado')).toBeInTheDocument();
    expect(within(dialogo).getByText(/se quitan al guardar/)).toBeInTheDocument();
    await marcarCliente('Cliente Centro');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar clientes' }));
    await screen.findByText('Clientes de monitorista.dos@ai27.mx guardados.');
    expect(cuerpos).toEqual([{ clientes_ids: ['CLI-1002'] }]);
  });

  it('E10: con solo clientes desactivados se puede guardar para limpiarlos', async () => {
    conClienteDesactivado();
    renderRoster();
    await userEvent.click(
      await screen.findByRole('link', { name: 'Editar clientes de monitorista.dos@ai27.mx' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar clientes' }));
    await screen.findByText('Clientes de monitorista.dos@ai27.mx guardados.');
    expect(cuerpos).toEqual([{ clientes_ids: [] }]);
  });

  it('sin cambios y sin desactivados no se puede guardar', async () => {
    renderRoster();
    await userEvent.click(
      await screen.findByRole('link', { name: 'Editar clientes de Laura Méndez' }),
    );
    expect(await screen.findByRole('button', { name: 'Guardar clientes' })).toBeDisabled();
    expect(screen.getByText('No hay cambios por guardar.')).toBeInTheDocument();
  });

  it('400: dice que un cliente no existe o está desactivado y vuelve a pedir los activos', async () => {
    server.use(
      http.put(path('/sujetos/:id/alcance/clientes'), () =>
        HttpResponse.json({ codigo: 'validacion', mensaje: 'x' }, { status: 400 }),
      ),
    );
    renderRoster();
    await userEvent.click(
      await screen.findByRole('link', { name: 'Editar clientes de Laura Méndez' }),
    );
    await marcarCliente('Cliente Sur');
    const antes = peticiones.filter((p) => p === 'GET /api/v1/clientes').length;
    await userEvent.click(screen.getByRole('button', { name: 'Guardar clientes' }));
    expect(
      await screen.findByText(/Algún cliente elegido no existe o está desactivado/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(peticiones.filter((p) => p === 'GET /api/v1/clientes').length).toBeGreaterThan(antes),
    );
  });

  it.each([
    [
      'rol_sin_alcance',
      'El usuario ya no es Monitorista y no puede tener clientes asignados. Recarga la lista.',
    ],
    ['sujeto_desactivado', 'El Monitorista está desactivado. Recarga la lista.'],
  ])('409 %s al guardar: lo dice y conserva la selección', async (codigo, texto) => {
    server.use(
      http.put(path('/sujetos/:id/alcance/clientes'), () =>
        HttpResponse.json({ codigo, mensaje: 'x' }, { status: 409 }),
      ),
    );
    renderRoster();
    await userEvent.click(
      await screen.findByRole('link', { name: 'Editar clientes de Laura Méndez' }),
    );
    await marcarCliente('Cliente Norte');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar clientes' }));
    expect(await screen.findByText(texto)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar a Cliente Norte' })).toBeNull();
  });

  it('403 al guardar: falta de permiso, sin cerrar la sesión', async () => {
    server.use(
      http.put(path('/sujetos/:id/alcance/clientes'), () =>
        HttpResponse.json({ codigo: 'prohibido', mensaje: 'x' }, { status: 403 }),
      ),
    );
    renderRoster();
    await userEvent.click(
      await screen.findByRole('link', { name: 'Editar clientes de Laura Méndez' }),
    );
    await marcarCliente('Cliente Norte');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar clientes' }));
    expect(
      await screen.findByText('No tienes permiso para asignar clientes a los Monitoristas.'),
    ).toBeInTheDocument();
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('el administrador también asigna clientes', async () => {
    rolActual = Rol.Administrador;
    renderRoster();
    await userEvent.click(
      await screen.findByRole('link', { name: 'Editar clientes de monitorista.dos@ai27.mx' }),
    );
    await marcarCliente('Cliente Sur');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar clientes' }));
    await screen.findByText('Clientes de monitorista.dos@ai27.mx guardados.');
    expect(cuerpos).toEqual([{ clientes_ids: ['CLI-1003'] }]);
  });
  it('el jefe operativo no ve controles de subordinados ni altas de vehículos o custodios', async () => {
    renderRoster();
    await filaDe('Laura Méndez');
    expect(screen.queryByText(/subordinados/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /vehículo|custodio/i })).toBeNull();
  });
});

describe('Roster — cliente al que sirve una unidad', () => {
  async function abrirSelectorDeCliente() {
    await userEvent.click(await screen.findByRole('button', { name: /Cliente al que sirve/ }));
  }

  it('el alta lo ofrece como opcional y aclara que no define el alcance', async () => {
    renderRoster();
    await userEvent.click(await screen.findByRole('button', { name: 'Nueva unidad' }));
    await screen.findByRole('combobox', { name: 'Vehículo' });
    expect(
      await screen.findByText(/no define qué clientes ve cada Monitorista/),
    ).toBeInTheDocument();
    expect(screen.getByText(/\(opcional\)/)).toBeInTheDocument();
  });

  it('el alta con cliente envía cliente_id; sin cliente no envía el campo', async () => {
    renderRoster();
    await crearUnidadCon('P-102 · DEF-5678 (coche)', ['María Torres']);
    await screen.findByText('Unidad creada.');
    expect(cuerpos).toEqual([{ vehiculo_id: 'VEH-2003', custodios_ids: ['CUS-3004'] }]);
  });

  it('el alta con un cliente elegido lo envía', async () => {
    renderRoster();
    await abrirAlta();
    await elegirVehiculo('P-102 · DEF-5678 (coche)');
    await alternarCustodio('María Torres');
    await abrirSelectorDeCliente();
    await userEvent.click(await screen.findByRole('button', { name: 'Cliente Centro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear unidad' }));
    await screen.findByText('Unidad creada.');
    expect(cuerpos).toEqual([
      { vehiculo_id: 'VEH-2003', custodios_ids: ['CUS-3004'], cliente_id: 'CLI-1002' },
    ]);
  });

  it('quitar el cliente en la edición envía cliente_id: null', async () => {
    server.use(
      http.get(path('/unidades'), () =>
        HttpResponse.json({
          items: [
            {
              id: 'UN-1003',
              vehiculo_id: 'VEH-2003',
              custodios_ids: ['CUS-3003'],
              tipo: 'patrulla',
              activa: true,
              cliente_id: 'CLI-1002',
              vehiculo: { economico: 'P-102', placas: 'DEF-5678' },
              custodios: [{ id: 'CUS-3003', nombre: 'María Torres' }],
            },
          ],
          cursor_siguiente: null,
        }),
      ),
      http.patch(path('/unidades/UN-1003'), () =>
        HttpResponse.json({
          id: 'UN-1003',
          vehiculo_id: 'VEH-2003',
          custodios_ids: ['CUS-3003'],
          tipo: 'patrulla',
          activa: true,
          cliente_id: null,
        }),
      ),
    );
    renderRoster();
    await userEvent.click(
      await screen.findByRole('link', { name: 'Editar unidad P-102 · DEF-5678' }),
    );
    expect(await screen.findByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    await abrirSelectorDeCliente();
    const opciones = await screen.findAllByRole('button', { name: 'Sin cliente' });
    await userEvent.click(opciones[opciones.length - 1]!);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByText('Unidad actualizada.');
    expect(cuerpos).toEqual([{ cliente_id: null }]);
  });
});
