/*
 * M14 · transferir una conversación de solicitud (tarea 15.8; E10-HU-038, DEC-148 #74).
 *
 * `responsable_destino_id` es el `UsuarioAdmin.id` de un usuario `cotizacion`, no su `sub`;
 * `mensajeria` valida el rol y responde `409 destino_no_es_cotizacion`. El comportamiento está
 * publicado en `tracer.47` pero sin desplegar en ningún ambiente: todo corre contra handlers MSW
 * propios. Q-D de `BRECHAS.md`: `listarSujetos` solo lo lee el administrador, así que un usuario
 * `cotizacion` hoy recibe `403` al listar destinos; la prueba con listado permitido emula la
 * respuesta del servidor una vez resuelta Q-D.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Rol } from '@ai27-tech/contracts/roles';

import { Solicitudes } from '@/features/solicitudes/Solicitudes';

const YO = 'u1';
const OTRO = 'u2';
const CONVERSACION = 'CNV-S1';

const server = setupServer();
const logoutSpy = vi.fn();
const sesiones = vi.hoisted(() => ({ actual: null as unknown }));
let rolActual: Rol = Rol.Administrador;
let responsableId: string | null = YO;
let version = 3;
const cuerpos: unknown[] = [];
const peticiones: string[] = [];

function sesionDe(rol: Rol) {
  const usuario = { id: YO, rol, audiencia: 'Interno' };
  // Objeto estable entre renders: `useNombresCliente` depende de la identidad de `sesion`.
  return { sesion: { accessToken: 'token-de-prueba', usuario }, usuario, logout: logoutSpy };
}

vi.mock('@/context/SessionContext', () => ({
  useSession: () => sesiones.actual,
}));

const reclamoDe = (responsable: string) => ({
  id: `REC-${version}`,
  conversacion_id: CONVERSACION,
  responsable_id: responsable,
  version,
  abierto_en: '2026-11-25T10:00:00Z',
  cerrado_en: null,
});

const conversacion = () => ({
  id: CONVERSACION,
  tipo: 'solicitud',
  viaje_id: 'SOL-1002',
  cliente_id: 'CLI-1002',
  bandeja_id: 'BDJ-S',
  estado: 'abierta',
  escritura_hasta: '2026-12-31T00:00:00Z',
  ultima_secuencia: 0,
  version_reclamo: version,
  reclamo_activo: responsableId ? reclamoDe(responsableId) : null,
  atendida_en: null,
  abierta_en: '2026-11-25T09:00:00Z',
});

const usuariosCotizacion = [
  { id: YO, nombre: 'Yo mismo', rol: 'cotizacion', activo: true, es_propio: true },
  { id: 'USR-COT-2', nombre: 'Ana Cotización', rol: 'cotizacion', activo: true, es_propio: false },
  { id: 'USR-COT-3', nombre: 'Beto Cotización', rol: 'cotizacion', activo: true, es_propio: false },
];

/** Handlers de la bandeja de solicitudes, la conversación y la transferencia. */
function servirConversacion() {
  server.use(
    http.get('*/bandeja/solicitudes', () =>
      HttpResponse.json({ items: [conversacion()], revision: 1, cursor_siguiente: null }),
    ),
    http.get('*/clientes', () => HttpResponse.json({ items: [], cursor_siguiente: null })),
    http.get(`*/conversaciones/${CONVERSACION}`, () => HttpResponse.json(conversacion())),
    http.get(`*/conversaciones/${CONVERSACION}/mensajes`, () =>
      HttpResponse.json({ items: [], hay_mas: false }),
    ),
    http.post(
      `*/conversaciones/${CONVERSACION}/recibos/leido`,
      () => new HttpResponse(null, { status: 204 }),
    ),
    http.post(`*/conversaciones/${CONVERSACION}/transferencias`, async ({ request }) => {
      cuerpos.push(await request.json());
      const { responsable_destino_id: destino } = cuerpos.at(-1) as {
        responsable_destino_id: string;
      };
      version += 1;
      responsableId = destino;
      return HttpResponse.json(reclamoDe(destino), { status: 201 });
    }),
  );
}

/** Lo que haría el servidor una vez resuelta Q-D: `cotizacion` también puede listar destinos. */
function servirListadoDeUsuarios() {
  server.use(
    http.get('*/sujetos', ({ request }) => {
      peticiones.push(`GET ${new URL(request.url).pathname}${new URL(request.url).search}`);
      return HttpResponse.json({ items: usuariosCotizacion, cursor_siguiente: null });
    }),
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  rolActual = Rol.Administrador;
  responsableId = YO;
  version = 3;
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  logoutSpy.mockReset();
  cuerpos.length = 0;
  peticiones.length = 0;
});
afterAll(() => server.close());

function montar() {
  sesiones.actual = sesionDe(rolActual);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Solicitudes
        id={null}
        vista="conversaciones"
        conversacion={CONVERSACION}
        onAbrir={vi.fn()}
        onVolver={vi.fn()}
        onVerViaje={vi.fn()}
        onCambiarVista={vi.fn()}
        onSeleccionarConversacion={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

async function abrirDialogo() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Transferir' }));
  return { user, dialogo: await screen.findByRole('dialog', { name: /Transferir conversación/ }) };
}

async function elegirDestino(user: ReturnType<typeof userEvent.setup>, dialogo: HTMLElement) {
  await user.click(await within(dialogo).findByRole('button', { name: /Destino/ }));
  await user.click(await screen.findByRole('button', { name: 'Ana Cotización' }));
}

describe('15.8 · el Administrador transfiere una conversación de solicitud', () => {
  beforeEach(() => {
    servirConversacion();
    servirListadoDeUsuarios();
  });

  it('lista a los usuarios de cotización activos, sin él mismo, y manda el id del sujeto', async () => {
    montar();
    const { user, dialogo } = await abrirDialogo();

    expect(peticiones).toContain('GET /api/v1/sujetos?rol=cotizacion&activo=true');
    const confirmar = within(dialogo).getByRole('button', { name: 'Transferir' });
    expect(confirmar).toBeDisabled();

    await user.click(await within(dialogo).findByRole('button', { name: /Destino/ }));
    expect(screen.queryByRole('button', { name: 'Yo mismo' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Beto Cotización' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ana Cotización' }));
    await user.type(within(dialogo).getByLabelText('Motivo'), '  Salgo de turno  ');
    await user.click(within(dialogo).getByRole('button', { name: 'Transferir' }));

    await waitFor(() => expect(cuerpos).toHaveLength(1));
    // `UsuarioAdmin.id` del destino, no su `sub`; la versión es la del reclamo vigente.
    expect(cuerpos[0]).toEqual({
      version_esperada: 3,
      responsable_destino_id: 'USR-COT-2',
      motivo: 'Salgo de turno',
    });
    // El reclamo pasó a otra persona: el diálogo se cierra y ya no ofrece transferir.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Transferir' })).toBeNull();
  });

  it('sin motivo no manda el campo', async () => {
    montar();
    const { user, dialogo } = await abrirDialogo();
    await elegirDestino(user, dialogo);
    await user.click(within(dialogo).getByRole('button', { name: 'Transferir' }));

    await waitFor(() => expect(cuerpos).toHaveLength(1));
    expect(cuerpos[0]).toEqual({ version_esperada: 3, responsable_destino_id: 'USR-COT-2' });
  });

  it('un 409 destino_no_es_cotizacion tiene texto propio y conserva el diálogo', async () => {
    server.use(
      http.post(`*/conversaciones/${CONVERSACION}/transferencias`, () =>
        HttpResponse.json(
          { codigo: 'destino_no_es_cotizacion', mensaje: 'el destino no es cotizacion' },
          { status: 409 },
        ),
      ),
    );
    montar();
    const { user, dialogo } = await abrirDialogo();
    await elegirDestino(user, dialogo);
    await user.click(within(dialogo).getByRole('button', { name: 'Transferir' }));

    expect(await within(dialogo).findByText(/no tiene el rol de Cotización/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('un 409 por versión vieja se explica y recarga la conversación', async () => {
    server.use(
      http.post(`*/conversaciones/${CONVERSACION}/transferencias`, () =>
        HttpResponse.json({ codigo: 'conflicto_version_reclamo' }, { status: 409 }),
      ),
    );
    montar();
    const { user, dialogo } = await abrirDialogo();
    await elegirDestino(user, dialogo);
    await user.click(within(dialogo).getByRole('button', { name: 'Transferir' }));

    expect(await within(dialogo).findByText(/La conversación cambió/)).toBeInTheDocument();
  });

  it('un 403 de quien ya no es el responsable se explica', async () => {
    server.use(
      http.post(`*/conversaciones/${CONVERSACION}/transferencias`, () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
    );
    montar();
    const { user, dialogo } = await abrirDialogo();
    await elegirDestino(user, dialogo);
    await user.click(within(dialogo).getByRole('button', { name: 'Transferir' }));

    expect(
      await within(dialogo).findByText(/Solo el responsable activo puede ejecutar esta acción/),
    ).toBeInTheDocument();
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('si no hay otros usuarios de cotización lo dice y no deja confirmar', async () => {
    server.use(
      http.get('*/sujetos', () =>
        HttpResponse.json({ items: [usuariosCotizacion[0]], cursor_siguiente: null }),
      ),
    );
    montar();
    const { dialogo } = await abrirDialogo();

    expect(
      await within(dialogo).findByText('No hay otros usuarios activos de Cotización.'),
    ).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: 'Transferir' })).toBeDisabled();
  });
});

describe('15.8 · quién ve el botón', () => {
  beforeEach(() => servirListadoDeUsuarios());

  it('solo el responsable del reclamo: con el reclamo de otra persona no se ofrece', async () => {
    responsableId = OTRO;
    servirConversacion();
    montar();

    expect(await screen.findByText('Otra persona')).toBeInTheDocument();
    await screen.findByText(/Solicitud SOL-1002/);
    expect(screen.queryByRole('button', { name: 'Transferir' })).toBeNull();
    expect(peticiones).toEqual([]);
  });

  it('con la conversación en el pool (sin reclamo) no se ofrece', async () => {
    responsableId = null;
    servirConversacion();
    montar();

    expect(await screen.findByRole('button', { name: 'Reclamar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transferir' })).toBeNull();
  });
});

describe('15.8 · Cotización y Q-D (no puede listar usuarios)', () => {
  beforeEach(() => {
    rolActual = Rol.Cotizacion;
    servirConversacion();
  });

  it('hoy el listado responde 403: se explica, no hay selector y no se transfiere', async () => {
    server.use(
      http.get('*/sujetos', () => HttpResponse.json({ codigo: 'prohibido' }, { status: 403 })),
    );
    montar();
    const { dialogo } = await abrirDialogo();

    expect(
      await within(dialogo).findByText(/no puede consultar la lista de usuarios de Cotización/),
    ).toBeInTheDocument();
    expect(within(dialogo).queryByRole('button', { name: /Destino/ })).toBeNull();
    expect(within(dialogo).getByRole('button', { name: 'Transferir' })).toBeDisabled();
    expect(cuerpos).toEqual([]);
    // El 403 del listado no cierra la sesión.
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('con el listado permitido (Q-D resuelta) transfiere igual que el Administrador', async () => {
    servirListadoDeUsuarios();
    montar();
    const { user, dialogo } = await abrirDialogo();
    await elegirDestino(user, dialogo);
    await user.click(within(dialogo).getByRole('button', { name: 'Transferir' }));

    await waitFor(() => expect(cuerpos).toHaveLength(1));
    expect(cuerpos[0]).toMatchObject({ responsable_destino_id: 'USR-COT-2', version_esperada: 3 });
  });
});
