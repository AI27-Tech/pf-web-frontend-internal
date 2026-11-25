/*
 * M14 · Solicitudes (Requirement 15; escenarios E14 y E15 del spec afinacion-roles-modulo-a-modulo).
 *
 * Corre contra los handlers MSW de `src/mocks/solicitudes.ts`, que reproducen la frontera del
 * `bff`: el Jefe Operativo solo alcanza `PAGADO` y nunca recibe `cotizacion` ni `pago`.
 */

import type { ComponentProps } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { Rol } from '@ai27-tech/contracts/roles';

import { Solicitudes } from '@/features/solicitudes/Solicitudes';
import { mockAccessToken } from '@/mocks/data';
import { handlersSolicitudes, reiniciarSolicitudesMock } from '@/mocks/solicitudes';

const server = setupServer(...handlersSolicitudes);
const logoutSpy = vi.fn();
let rolActual: Rol = Rol.JefeOperativo;
const peticiones: string[] = [];
const cuerpos: unknown[] = [];

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: {
      accessToken: mockAccessToken(rolActual),
      usuario: { id: 'u1', rol: rolActual, audiencia: 'Interno' },
    },
    usuario: { id: 'u1', rol: rolActual, audiencia: 'Interno' },
    logout: logoutSpy,
  }),
}));

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  server.events.on('request:start', async ({ request }) => {
    const url = new URL(request.url);
    peticiones.push(`${request.method} ${url.pathname}${url.search}`);
    if (request.method !== 'GET')
      cuerpos.push(
        await request
          .clone()
          .json()
          .catch(() => null),
      );
  });
});
beforeEach(() => reiniciarSolicitudesMock());
afterEach(() => {
  cleanup();
  server.resetHandlers();
  logoutSpy.mockReset();
  rolActual = Rol.JefeOperativo;
  peticiones.length = 0;
  cuerpos.length = 0;
});
afterAll(() => server.close());

function montar(id: string | null, extra: Partial<ComponentProps<typeof Solicitudes>> = {}) {
  const callbacks = {
    onAbrir: vi.fn(),
    onVolver: vi.fn(),
    onVerViaje: vi.fn(),
    onCambiarVista: vi.fn(),
    onSeleccionarConversacion: vi.fn(),
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Solicitudes id={id} {...callbacks} {...extra} />
    </QueryClientProvider>,
  );
  return callbacks;
}

const boton = (nombre: string | RegExp) => screen.queryByRole('button', { name: nombre });
const filas = () =>
  within(screen.getByRole('table', { name: 'Bandeja de solicitudes' })).getAllByRole('row');

describe('M14 · bandeja', () => {
  it('el Jefe Operativo pide y ve solo PAGADO, sin filtro de estado ni columna de cotización', async () => {
    montar(null);

    expect(await screen.findAllByRole('button', { name: /^Abrir solicitud/ })).toHaveLength(2);
    expect(peticiones).toContain('GET /api/v1/solicitudes?estado=PAGADO');
    expect(screen.getAllByText('Pagado').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cotizado')).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Cotización' })).toBeNull();
    expect(screen.queryByText(/18500/)).toBeNull();
    expect(screen.queryByText('Todos los estados')).toBeNull();
  });

  it('Cotización ve todas las solicitudes, el monto y puede filtrar por estado', async () => {
    rolActual = Rol.Cotizacion;
    montar(null);

    expect((await screen.findAllByText('18500.00 MXN')).length).toBeGreaterThan(0);
    expect(filas()).toHaveLength(1 + 5);
    expect(screen.getByRole('columnheader', { name: 'Cotización' })).toBeInTheDocument();
    expect(screen.getByText('Todos los estados')).toBeInTheDocument();
    expect(peticiones).toContain('GET /api/v1/solicitudes');
  });

  it('el Administrador ve todas las solicitudes', async () => {
    rolActual = Rol.Administrador;
    montar(null);

    expect(await screen.findAllByRole('button', { name: /^Abrir solicitud/ })).toHaveLength(5);
  });

  it.each([Rol.Ejecutivo, Rol.Monitorista, Rol.Supervisor, Rol.Coordinador, Rol.Reaccion])(
    '%s recibe 403: "sin permiso" y la sesión sigue',
    async (rol) => {
      rolActual = rol;
      montar(null);

      expect(
        await screen.findByText('No tienes permiso para ver las solicitudes.'),
      ).toBeInTheDocument();
      expect(logoutSpy).not.toHaveBeenCalled();
    },
  );

  it('abrir una solicitud avisa a quien navega con su id', async () => {
    const user = userEvent.setup();
    const { onAbrir } = montar(null);

    const abrir = await screen.findAllByRole('button', { name: /^Abrir solicitud/ });
    await user.click(abrir[0] as HTMLElement);

    expect(onAbrir).toHaveBeenCalledWith('SOL-1003');
  });
});

describe('M14 · detalle del Jefe Operativo', () => {
  it('no pinta cotización, pago ni monto, y ofrece solo aprobar y rechazar', async () => {
    montar('SOL-1003');

    expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeEnabled();
    expect(boton('Rechazar')).toBeInTheDocument();
    expect(boton(/Cotizar|Recotizar/)).toBeNull();
    expect(boton('Confirmar pago')).toBeNull();
    expect(boton('Reprogramar')).toBeNull();
    expect(boton('Revertir pago')).toBeNull();
    expect(screen.queryByText('Cotización y pago')).toBeNull();
    expect(screen.queryByText(/18500/)).toBeNull();
    // El histórico aparece, sin el importe de la cotización.
    expect(await screen.findByText('Pago confirmado')).toBeInTheDocument();
    expect(screen.queryByText(/MXN/)).toBeNull();
  });

  it('sin fecha y hora del servicio el botón Aprobar se bloquea y se explica', async () => {
    montar('SOL-1004');

    expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeDisabled();
    expect(
      screen.getByText(/No se puede aprobar sin fecha y hora del servicio/),
    ).toBeInTheDocument();
  });

  it('aprobar manda al viaje con el mismo id y no vuelve a pedir la solicitud', async () => {
    const user = userEvent.setup();
    const { onVerViaje } = montar('SOL-1003');

    await user.click(await screen.findByRole('button', { name: 'Aprobar' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Aprobar' }));

    await waitFor(() => expect(onVerViaje).toHaveBeenCalledWith('SOL-1003'));
    expect(peticiones).toContain('POST /api/v1/solicitudes/SOL-1003/aprobacion');
    // El 404 posterior del Jefe Operativo no se pide ni se muestra como error.
    expect(peticiones.filter((p) => p === 'GET /api/v1/solicitudes/SOL-1003')).toHaveLength(1);
    expect(screen.queryByText('Solicitud resuelta')).toBeNull();
    expect(await screen.findByText('Solicitud aprobada. El viaje ya existe.')).toBeInTheDocument();
  });

  it('rechazar exige motivo, no menciona reembolso y vuelve a la bandeja', async () => {
    const user = userEvent.setup();
    const { onVolver } = montar('SOL-1003');

    await user.click(await screen.findByRole('button', { name: 'Rechazar' }));
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo.textContent).not.toMatch(/reembolso/i);
    const confirmar = within(dialogo).getByRole('button', { name: 'Rechazar' });
    expect(confirmar).toBeDisabled();

    await user.type(within(dialogo).getByLabelText(/Motivo del rechazo/), 'Sin escolta disponible');
    await user.click(confirmar);

    await waitFor(() => expect(onVolver).toHaveBeenCalled());
    expect(cuerpos).toEqual([{ motivo: 'Sin escolta disponible' }]);
  });

  it('una solicitud fuera de PAGADO es 404 y se dice "resuelta", sin error', async () => {
    montar('SOL-1002');

    expect(await screen.findByText('Solicitud resuelta')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(logoutSpy).not.toHaveBeenCalled();
  });
});

describe('M14 · detalle de Cotización', () => {
  beforeEach(() => {
    rolActual = Rol.Cotizacion;
  });

  it('en COTIZADO ofrece recotizar y confirmar pago, y muestra cotización y pago', async () => {
    montar('SOL-1002');

    expect(await screen.findByRole('button', { name: 'Recotizar' })).toBeInTheDocument();
    expect(boton('Confirmar pago')).toBeInTheDocument();
    expect(boton('Aprobar')).toBeNull();
    expect(boton('Rechazar')).toBeNull();
    expect(boton('Revertir pago')).toBeNull();
    expect(screen.getByText('Cotización y pago')).toBeInTheDocument();
    expect(screen.getByText(/18500\.00 MXN \(versión 1\)/)).toBeInTheDocument();
  });

  it('en PAGADO reprograma, pero no aprueba ni revierte el pago', async () => {
    montar('SOL-1003');

    expect(await screen.findByRole('button', { name: 'Reprogramar' })).toBeInTheDocument();
    expect(boton('Aprobar')).toBeNull();
    expect(boton('Rechazar')).toBeNull();
    expect(boton('Revertir pago')).toBeNull();
  });

  it('en SOLICITADO cotiza: valida el monto y envía la cotización', async () => {
    const user = userEvent.setup();
    montar('SOL-1001');

    await user.click(await screen.findByRole('button', { name: 'Cotizar' }));
    const dialogo = await screen.findByRole('dialog');
    const enviar = within(dialogo).getByRole('button', { name: 'Enviar cotización' });
    expect(enviar).toBeDisabled();

    await user.type(within(dialogo).getByLabelText(/Monto/), 'mucho');
    expect(within(dialogo).getByText(/Escribe el importe con números/)).toBeInTheDocument();
    expect(enviar).toBeDisabled();

    await user.clear(within(dialogo).getByLabelText(/Monto/));
    await user.type(within(dialogo).getByLabelText(/Monto/), '9500.50');
    expect(enviar).toBeEnabled();
    await user.click(enviar);

    expect(await screen.findByText('Cotización enviada.')).toBeInTheDocument();
    const cuerpo = cuerpos[0] as Record<string, unknown>;
    expect(cuerpo).toMatchObject({ monto: '9500.50', moneda: 'MXN' });
    expect(typeof cuerpo.fecha_hora_servicio).toBe('string');
    // La solicitud quedó cotizada y ahora se puede recotizar.
    expect(await screen.findByRole('button', { name: 'Recotizar' })).toBeInTheDocument();
  });

  it('confirmar el pago exige la fecha del pago', async () => {
    const user = userEvent.setup();
    montar('SOL-1002');

    await user.click(await screen.findByRole('button', { name: 'Confirmar pago' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByRole('button', { name: 'Confirmar pago' })).toBeDisabled();
    expect(
      within(dialogo).getByText(/La fecha del pago debe caer en la vigencia/),
    ).toBeInTheDocument();
  });

  it('un 409 por fecha de pago fuera de vigencia se explica y conserva el diálogo', async () => {
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.put('*/solicitudes/:id/pago', () =>
        HttpResponse.json(
          { codigo: 'fecha_pago_fuera_de_vigencia', mensaje: 'x' },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    montar('SOL-1002');

    await user.click(await screen.findByRole('button', { name: 'Confirmar pago' }));
    const dialogo = await screen.findByRole('dialog');
    const fecha = within(dialogo).getByLabelText(/Fecha del pago/);
    // DateInput es texto DD/MM/AAAA y confirma al salir del campo.
    await user.type(fecha, '01/01/2020');
    await user.tab();
    await user.click(within(dialogo).getByRole('button', { name: 'Confirmar pago' }));

    expect(
      await within(dialogo).findByText(/La fecha del pago debe caer dentro de la vigencia/),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('M14 · detalle del Administrador', () => {
  it('en PAGADO tiene aprobar, rechazar, reprogramar y revertir el pago', async () => {
    rolActual = Rol.Administrador;
    montar('SOL-1003');

    expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    expect(boton('Rechazar')).toBeInTheDocument();
    expect(boton('Reprogramar')).toBeInTheDocument();
    expect(boton('Revertir pago')).toBeInTheDocument();
    expect(screen.getByText('Cotización y pago')).toBeInTheDocument();
  });

  it('revertir el pago exige motivo y deja la solicitud cotizada', async () => {
    rolActual = Rol.Administrador;
    const user = userEvent.setup();
    montar('SOL-1003');

    await user.click(await screen.findByRole('button', { name: 'Revertir pago' }));
    const dialogo = await screen.findByRole('dialog');
    const confirmar = within(dialogo).getByRole('button', { name: 'Revertir pago' });
    expect(confirmar).toBeDisabled();
    await user.type(
      within(dialogo).getByLabelText(/Motivo de la reversa/),
      'Se confirmó por error',
    );
    await user.click(confirmar);

    expect(await screen.findByRole('button', { name: 'Confirmar pago' })).toBeInTheDocument();
    expect(boton('Aprobar')).toBeNull();
  });
});

describe('M14 · conversaciones de solicitud (15.5)', () => {
  it('Cotización ve las dos vistas y la bandeja de conversaciones pide el pool de solicitudes', async () => {
    rolActual = Rol.Cotizacion;
    montar(null, { vista: 'conversaciones' });

    expect(await screen.findByText('Conversaciones de solicitudes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitudes' })).toBeInTheDocument();
    await waitFor(() => expect(peticiones).toContain('GET /api/v1/bandeja/solicitudes'));
    // Cotización no lista clientes (403): no se pide el catálogo.
    expect(peticiones.some((p) => p.includes('/clientes'))).toBe(false);
    expect(peticiones.some((p) => p.includes('/bandeja/trabajo'))).toBe(false);
  });

  it('cambiar de vista avisa a quien navega', async () => {
    rolActual = Rol.Cotizacion;
    const user = userEvent.setup();
    const { onCambiarVista } = montar(null);

    await user.click(await screen.findByRole('button', { name: 'Conversaciones' }));
    expect(onCambiarVista).toHaveBeenCalledWith('conversaciones');
  });

  it('el Jefe Operativo no tiene la vista: ni botón ni peticiones, aunque la URL la pida', async () => {
    montar(null, { vista: 'conversaciones' });

    expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conversaciones' })).toBeNull();
    expect(peticiones.some((p) => p.includes('/bandeja'))).toBe(false);
  });
});
