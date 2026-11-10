/*
 * E8-T19 · Panel de usuario, alcance y organizaciones (tareas 9.2, 13.1, 14.1 y 17.6).
 *
 * Los casos con datos usan el adaptador HTTP real contra los mocks de la
 * administración. El caso de la tarea 17.6 usa el puerto falso porque necesita que
 * el servidor rechace con `403` y que la recarga del detalle falle a continuación.
 *
 * El rechazo real del servidor ante la auto-escalada se demuestra en la tarea 19.4.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { AdministracionProvider } from '@/context/AdministracionContext';
import { ApiError } from '@/lib/api/errors';
import { crearAdministracionHttp, type AdministracionPort } from '@/lib/api/administracion';
import { Rol } from '@/lib/contracts';
import { AlcanceEditor } from '@/features/administracion/AlcanceEditor';
import { PanelUsuario } from '@/features/administracion/PanelUsuario';
import { SeccionOrganizaciones } from '@/features/administracion/SeccionOrganizaciones';
import { TEXTOS_ADMINISTRACION as TEXTOS } from '@/features/administracion/mensajes';
import { useEnvioUnico, type EnvioUnico } from '@/features/administracion/useEnvioUnico';
import { handlersAdministracion, reiniciarAdministracionMock } from '@/mocks/administracion';
import type { UsuarioResumen } from '@/lib/contracts/administracion';

import { crearPuertoFalso } from './puertoFalso';

vi.mock('@/context/SessionContext', async () => {
  const { mockAccessToken: token } = await import('@/mocks/data');
  return {
    useSession: () => ({
      sesion: { accessToken: token(Rol.Administrador) },
      usuario: { id: 'usr-demo-1', rol: Rol.Administrador },
    }),
  };
});

const servidor = setupServer(...handlersAdministracion);

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => reiniciarAdministracionMock());
afterEach(() => {
  cleanup();
  servidor.resetHandlers();
});
afterAll(() => servidor.close());

/** Árbol real: consultas sin reintento, puerto inyectado y cerrojo de envío del padre. */
function Montaje({
  puerto,
  children,
}: {
  readonly puerto: AdministracionPort;
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

const puertoHttp = crearAdministracionHttp();

describe('E8-T19 · 9.2 PanelUsuario', () => {
  it('muestra el detalle del usuario con su rol y su estado', async () => {
    render(
      <Montaje puerto={puertoHttp}>
        {(envio) => (
          <PanelUsuario usuarioId="SUJ-002" envio={envio} onVolver={() => {}} onAviso={() => {}} />
        )}
      </Montaje>,
    );

    expect(await screen.findByRole('heading', { name: 'Lupita Monitorista' })).toBeTruthy();
    expect(screen.getByText('lupita.monitorista')).toBeTruthy();
    expect(screen.getByText('Monitorista')).toBeTruthy();
  });

  it('un usuario anterior a tracer.40 se muestra con texto de respaldo, sin error', async () => {
    render(
      <Montaje puerto={puertoHttp}>
        {(envio) => (
          <PanelUsuario usuarioId="SUJ-005" envio={envio} onVolver={() => {}} onAviso={() => {}} />
        )}
      </Montaje>,
    );

    expect(await screen.findByRole('heading', { name: TEXTOS.usuarioSinNombre })).toBeTruthy();
    expect(screen.getByText(TEXTOS.usuarioSinIdentificador)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('un 404 dice que el usuario no está disponible y no muestra datos de otro', async () => {
    render(
      <Montaje puerto={puertoHttp}>
        {(envio) => (
          <PanelUsuario usuarioId="SUJ-999" envio={envio} onVolver={() => {}} onAviso={() => {}} />
        )}
      </Montaje>,
    );

    expect(await screen.findByText(TEXTOS.usuarioNoDisponible)).toBeTruthy();
    expect(screen.queryByText('Lupita Monitorista')).toBeNull();
  });
});

describe('E8-T19 · 17.6 DoD 2: el servidor rechaza con 403 un cambio sobre el propio sujeto', () => {
  it('muestra la auto-escalada bloqueada, no cambia el rol y conserva el aviso si la recarga falla', async () => {
    const puerto = crearPuertoFalso();
    const usuario: UsuarioResumen = {
      id: 'usr-1',
      nombre: 'Monitorista de prueba',
      identificadorUsuario: 'monitorista.prueba',
      rol: Rol.Monitorista,
      activo: true,
      // La interfaz creyó que era ajeno: el servidor lo corrige con un 403.
      esPropio: false,
    };
    puerto.espias.obtenerUsuario.mockResolvedValueOnce(usuario);
    // La recarga posterior al rechazo falla.
    puerto.espias.obtenerUsuario.mockRejectedValue(new ApiError('degradado', 'caído', 503));
    puerto.espias.fijarRol.mockRejectedValue(
      new ApiError('prohibido', 'PUT /sujetos/usr-1/rol → 403', 403, 'autoescalamiento'),
    );
    const onAviso = vi.fn();
    const user = userEvent.setup();

    render(
      <Montaje puerto={puerto}>
        {(envio) => (
          <PanelUsuario usuarioId="usr-1" envio={envio} onVolver={() => {}} onAviso={onAviso} />
        )}
      </Montaje>,
    );

    await user.click(await screen.findByRole('button', { name: 'Cambiar rol' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('radio', { name: 'Supervisor' }));
    await user.click(within(dialogo).getByRole('button', { name: TEXTOS.cambiarRol }));

    // El aviso de auto-escalada llega a pesar de que la recarga del detalle falló.
    await waitFor(() =>
      expect(screen.getAllByText(TEXTOS.autoescaladaBloqueada).length).toBeGreaterThan(0),
    );
    await waitFor(() => expect(puerto.espias.obtenerUsuario.mock.calls.length).toBeGreaterThan(1));
    expect(await screen.findByText(TEXTOS.datosDesactualizados)).toBeTruthy();
    expect(screen.getAllByText(TEXTOS.autoescaladaBloqueada).length).toBeGreaterThan(0);

    expect(puerto.espias.fijarRol).toHaveBeenCalledTimes(1);
    expect(puerto.espias.fijarRol).toHaveBeenCalledWith(
      'usr-1',
      Rol.Supervisor,
      expect.any(String),
    );
    // El rol mostrado sigue siendo el anterior y nunca se anunció un éxito.
    expect(screen.getByText('Monitorista')).toBeTruthy();
    expect(onAviso).not.toHaveBeenCalledWith(expect.anything(), 'exito');
  });
});

describe('E8-T19 · 13.1 AlcanceEditor', () => {
  const supervisor: UsuarioResumen = {
    id: 'SUJ-003',
    nombre: 'Carlos Supervisor',
    identificadorUsuario: 'carlos.supervisor',
    rol: Rol.Supervisor,
    activo: true,
    esPropio: false,
  };

  it('un Supervisor elige entre los Monitoristas activos y guarda el conjunto final', async () => {
    const onAviso = vi.fn();
    const user = userEvent.setup();
    render(
      <Montaje puerto={puertoHttp}>
        {(envio) => <AlcanceEditor usuario={supervisor} envio={envio} onAviso={onAviso} />}
      </Montaje>,
    );

    // Solo aparecen Monitoristas activos: SUJ-005 está desactivado.
    expect(await screen.findByText('Lupita Monitorista')).toBeTruthy();
    expect(screen.queryByText(TEXTOS.usuarioSinNombre)).toBeNull();

    const casillas = screen.getAllByRole('checkbox');
    const casillaFila = casillas.at(-1);
    if (!casillaFila) throw new Error('No hay casilla de fila');
    await waitFor(() => expect(casillaFila).toBeChecked());

    await user.click(casillaFila);
    await user.click(screen.getByRole('button', { name: TEXTOS.alcanceGuardar }));

    await waitFor(() => expect(onAviso).toHaveBeenCalledWith('Alcance actualizado.', 'exito'));
  });

  it('un rol sin alcance no muestra el editor', () => {
    const { container } = render(
      <Montaje puerto={puertoHttp}>
        {(envio) => (
          <AlcanceEditor
            usuario={{ ...supervisor, rol: Rol.Ejecutivo }}
            envio={envio}
            onAviso={() => {}}
          />
        )}
      </Montaje>,
    );

    expect(container.querySelector('section')).toBeNull();
  });
});

describe('E8-T19 · 14.1 SeccionOrganizaciones', () => {
  it('lista las organizaciones y una desactivada no ofrece reactivar ni desactivar', async () => {
    render(
      <Montaje puerto={puertoHttp}>
        {(envio) => <SeccionOrganizaciones envio={envio} onAviso={() => {}} />}
      </Montaje>,
    );

    expect(await screen.findByText('Transportes Norte')).toBeTruthy();
    const filaVieja = screen.getByText('Carga Vieja').closest('tr') as HTMLElement;
    expect(within(filaVieja).queryByRole('button', { name: TEXTOS.desactivar })).toBeNull();
    expect(within(filaVieja).queryByRole('button', { name: /reactivar/i })).toBeNull();
  });

  it('al crear una organización la lista se vuelve a leer y la muestra', async () => {
    const onAviso = vi.fn();
    const user = userEvent.setup();
    render(
      <Montaje puerto={puertoHttp}>
        {(envio) => <SeccionOrganizaciones envio={envio} onAviso={onAviso} />}
      </Montaje>,
    );
    await screen.findByText('Transportes Norte');

    await user.click(screen.getByRole('button', { name: TEXTOS.nuevaOrganizacion }));
    const dialogo = await screen.findByRole('dialog');
    await user.type(within(dialogo).getByLabelText(/^Nombre/), 'Fletes del Bajío');
    await user.type(within(dialogo).getByLabelText(/Correo/), 'hola@bajio.mx');
    await user.type(within(dialogo).getByLabelText(/Teléfono/), '5559999');
    await user.click(within(dialogo).getByRole('button', { name: TEXTOS.guardar }));

    expect(await screen.findByText('Fletes del Bajío')).toBeTruthy();
    expect(onAviso).toHaveBeenCalledWith('Organización guardada.', 'exito');
  });
});
