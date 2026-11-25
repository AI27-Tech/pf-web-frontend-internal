/*
 * M12 · Administración: "mis clientes" en el editor de alcance y selector de nueve roles
 * (Requirement 13, con los criterios 3 a 7 de Requirement 12).
 *
 * El editor usa el puerto falso para controlar el alcance y los rechazos del servidor;
 * `listarClientes` sale de un servidor MSW con el catálogo de demostración.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { AdministracionProvider } from '@/context/AdministracionContext';
import { ApiError } from '@/lib/api/errors';
import { API_PREFIX } from '@/lib/constants';
import { Rol } from '@/lib/contracts';
import type { Organizacion, UsuarioResumen } from '@/lib/contracts/administracion';
import { AlcanceEditor } from '@/features/administracion/AlcanceEditor';
import { AltaUsuarioDialog } from '@/features/administracion/AltaUsuarioDialog';
import { CambioRolDialog } from '@/features/administracion/CambioRolDialog';
import { TEXTOS_ADMINISTRACION as TEXTOS } from '@/features/administracion/mensajes';
import { useEnvioUnico, type EnvioUnico } from '@/features/administracion/useEnvioUnico';
import { CLIENTES_DEMO } from '@/mocks/data';

import { crearPuertoFalso, type PuertoFalso } from './puertoFalso';

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-prueba' },
    usuario: { id: 'sub-admin', rol: 'administrador' },
  }),
}));

let pedidosClientes = 0;
const servidor = setupServer(
  http.get(`${API_PREFIX}/clientes`, () => {
    pedidosClientes += 1;
    return HttpResponse.json({ items: CLIENTES_DEMO, cursor_siguiente: null });
  }),
);

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  pedidosClientes = 0;
});
afterEach(() => {
  cleanup();
  servidor.resetHandlers();
});
afterAll(() => servidor.close());

function Montaje({
  puerto,
  children,
}: {
  readonly puerto: PuertoFalso;
  readonly children: (envio: EnvioUnico) => ReactNode;
}) {
  const envio = useEnvioUnico();
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AdministracionProvider port={puerto}>{children(envio)}</AdministracionProvider>
    </QueryClientProvider>
  );
}

const monitorista: UsuarioResumen = {
  id: 'usr-m',
  nombre: 'Lupita Monitorista',
  identificadorUsuario: 'lupita.monitorista',
  rol: Rol.Monitorista,
  activo: true,
  esPropio: false,
};

const organizacionVieja: Organizacion = {
  id: 'CLI-9999',
  nombre: 'Carga Vieja',
  activa: false,
  usuariosActivos: 0,
};

/** Puerto con el alcance de un Monitorista que tiene un cliente activo y uno desactivado. */
function puertoConDesactivado(): PuertoFalso {
  const puerto = crearPuertoFalso();
  puerto.espias.leerAlcance.mockResolvedValue({
    clientesIds: ['CLI-1001', 'CLI-9999'],
    subordinadosIds: [],
    clientesEfectivosIds: ['CLI-1001', 'CLI-9999'],
  });
  puerto.espias.listarOrganizaciones.mockResolvedValue([organizacionVieja]);
  return puerto;
}

function montarEditor(puerto: PuertoFalso, onAviso = vi.fn()) {
  render(
    <Montaje puerto={puerto}>
      {(envio) => <AlcanceEditor usuario={monitorista} envio={envio} onAviso={onAviso} />}
    </Montaje>,
  );
  return onAviso;
}

describe('M12 · AlcanceEditor de un Monitorista: "mis clientes"', () => {
  it('ofrece solo clientes activos y no usa unidades', async () => {
    const puerto = puertoConDesactivado();
    montarEditor(puerto);

    expect(await screen.findByText('Cliente Norte')).toBeTruthy();
    expect(screen.getByText('Cliente Centro')).toBeTruthy();
    expect(screen.getByText('Cliente Sur')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Clientes/ })).toBeTruthy();
    expect(screen.queryByText(/unidades/i)).toBeNull();
    // El cliente desactivado no es una opción de la tabla.
    expect(screen.getAllByRole('row')).toHaveLength(1 + CLIENTES_DEMO.length);
  });

  it('muestra al cliente desactivado con su nombre y la marca, y no lo reenvía al guardar', async () => {
    const puerto = puertoConDesactivado();
    puerto.espias.fijarAlcance.mockResolvedValue({
      clientesIds: ['CLI-1001', 'CLI-1002'],
      subordinadosIds: [],
      clientesEfectivosIds: ['CLI-1001', 'CLI-1002'],
    });
    const user = userEvent.setup();
    const onAviso = montarEditor(puerto);

    const aviso = (await screen.findByText(TEXTOS.alcanceClientesDesactivados)).closest(
      '[role="alert"]',
    ) as HTMLElement;
    expect(await within(aviso).findByText('Carga Vieja')).toBeTruthy();
    expect(within(aviso).getByText(TEXTOS.alcanceClienteDesactivado)).toBeTruthy();

    await waitFor(() => expect(screen.getAllByRole('checkbox')[1]).toBeChecked());
    // Se agrega CLI-1002 (segunda fila de datos).
    await user.click(screen.getAllByRole('checkbox')[2] as HTMLElement);
    await user.click(screen.getByRole('button', { name: TEXTOS.alcanceGuardar }));

    await waitFor(() => expect(onAviso).toHaveBeenCalledWith('Alcance actualizado.', 'exito'));
    expect(puerto.espias.fijarAlcance).toHaveBeenCalledTimes(1);
    const [id, cambio] = puerto.espias.fijarAlcance.mock.calls[0] ?? [];
    expect(id).toBe('usr-m');
    expect(cambio?.tipo).toBe('clientes');
    expect([...(cambio?.ids ?? [])].sort()).toEqual(['CLI-1001', 'CLI-1002']);
  });

  it('guardar sin tocar la tabla limpia al cliente desactivado del conjunto', async () => {
    const puerto = puertoConDesactivado();
    puerto.espias.fijarAlcance.mockResolvedValue({
      clientesIds: ['CLI-1001'],
      subordinadosIds: [],
      clientesEfectivosIds: ['CLI-1001'],
    });
    const user = userEvent.setup();
    montarEditor(puerto);

    await screen.findByText(TEXTOS.alcanceClientesDesactivados);
    await user.click(screen.getByRole('button', { name: TEXTOS.alcanceGuardar }));

    await waitFor(() => expect(puerto.espias.fijarAlcance).toHaveBeenCalledTimes(1));
    expect(puerto.espias.fijarAlcance.mock.calls[0]?.[1]).toEqual({
      tipo: 'clientes',
      ids: ['CLI-1001'],
    });
  });

  it('no pide organizaciones si no hay clientes desactivados', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.leerAlcance.mockResolvedValue({
      clientesIds: ['CLI-1001'],
      subordinadosIds: [],
      clientesEfectivosIds: ['CLI-1001'],
    });
    montarEditor(puerto);

    await screen.findByText('Cliente Norte');
    expect(screen.queryByText(TEXTOS.alcanceClientesDesactivados)).toBeNull();
    expect(puerto.espias.listarOrganizaciones).not.toHaveBeenCalled();
  });

  it('un 400 explica que un cliente no existe o está desactivado y vuelve a pedir los activos', async () => {
    const puerto = puertoConDesactivado();
    puerto.espias.fijarAlcance.mockRejectedValue(
      new ApiError('red', 'PUT → 400', 400, 'validacion'),
    );
    const user = userEvent.setup();
    const onAviso = montarEditor(puerto);

    await screen.findByText('Cliente Norte');
    expect(pedidosClientes).toBe(1);
    await user.click(screen.getByRole('button', { name: TEXTOS.alcanceGuardar }));

    await waitFor(() =>
      expect(onAviso).toHaveBeenCalledWith(TEXTOS.alcanceClientesInvalidos, 'error'),
    );
    await waitFor(() => expect(pedidosClientes).toBe(2));
  });

  it('un 409 rol_sin_alcance dice que el usuario ya no es Monitorista', async () => {
    const puerto = puertoConDesactivado();
    puerto.espias.fijarAlcance.mockRejectedValue(
      new ApiError('conflicto', 'PUT → 409', 409, 'rol_sin_alcance'),
    );
    const user = userEvent.setup();
    const onAviso = montarEditor(puerto);

    await screen.findByText('Cliente Norte');
    await user.click(screen.getByRole('button', { name: TEXTOS.alcanceGuardar }));

    await waitFor(() =>
      expect(onAviso).toHaveBeenCalledWith(TEXTOS.alcanceClientesRolSinAlcance, 'error'),
    );
  });

  it('no permite guardar mientras no se conozca la lista de clientes activos', async () => {
    servidor.use(http.get(`${API_PREFIX}/clientes`, () => new HttpResponse(null, { status: 500 })));
    const puerto = puertoConDesactivado();
    montarEditor(puerto);

    expect(await screen.findByText(TEXTOS.alcanceClientesNoDisponibles)).toBeTruthy();
    expect(screen.getByRole('button', { name: TEXTOS.alcanceGuardar })).toBeDisabled();
    // Sin la lista no se puede decir qué está desactivado.
    expect(screen.queryByText(TEXTOS.alcanceClientesDesactivados)).toBeNull();
    expect(puerto.espias.fijarAlcance).not.toHaveBeenCalled();
  });
});

describe('M12 · AlcanceEditor de un Supervisor no cambia de tipo', () => {
  it('sigue eligiendo Monitoristas y no pide clientes', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.leerAlcance.mockResolvedValue({
      clientesIds: [],
      subordinadosIds: [],
      clientesEfectivosIds: [],
    });
    puerto.espias.listarUsuarios.mockResolvedValue({
      items: [{ ...monitorista, id: 'usr-m2', nombre: 'Otra Monitorista' }],
      cursorSiguiente: null,
    });
    render(
      <Montaje puerto={puerto}>
        {(envio) => (
          <AlcanceEditor
            usuario={{ ...monitorista, id: 'usr-s', rol: Rol.Supervisor }}
            envio={envio}
            onAviso={vi.fn()}
          />
        )}
      </Montaje>,
    );

    expect(await screen.findByText('Otra Monitorista')).toBeTruthy();
    expect(pedidosClientes).toBe(0);
  });
});

describe('M12 · selector de rol de nueve valores', () => {
  it('el alta ofrece los nueve roles del contrato, con Cotización', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.listarOrganizaciones.mockResolvedValue([]);
    render(
      <Montaje puerto={puerto}>
        {(envio) => <AltaUsuarioDialog abierto onCerrar={vi.fn()} envio={envio} onAlta={vi.fn()} />}
      </Montaje>,
    );

    expect(await screen.findByRole('radio', { name: 'Cotización' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(9);
  });

  it('el cambio de rol de un interno ofrece Cotización y no Cliente', () => {
    const puerto = crearPuertoFalso();
    render(
      <Montaje puerto={puerto}>
        {(envio) => (
          <CambioRolDialog
            abierto
            onCerrar={vi.fn()}
            usuario={monitorista}
            relacion="ajeno"
            envio={envio}
            onCambiado={vi.fn()}
          />
        )}
      </Montaje>,
    );

    expect(screen.getByRole('radio', { name: 'Cotización' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Cliente' })).toBeNull();
  });
});
