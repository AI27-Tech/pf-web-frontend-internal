/*
 * E8-T19 · Bloque B de punta a punta: adaptador HTTP real (`crearAdministracionHttp`)
 * contra los mocks de la administración (`src/mocks/administracion.ts`). Cubre el
 * listado, el alta, el conflicto de identificador, la consecuencia de desactivar una
 * organización y el 403 de un rol que no es administrador.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { AdministracionProvider } from '@/context/AdministracionContext';
import { crearAdministracionHttp } from '@/lib/api/administracion';
import { Rol } from '@/lib/contracts';
import { AltaUsuarioDialog } from '@/features/administracion/AltaUsuarioDialog';
import { DesactivarOrganizacionDialog } from '@/features/administracion/DesactivarOrganizacionDialog';
import { SeccionUsuarios } from '@/features/administracion/SeccionUsuarios';
import { TEXTOS_ADMINISTRACION as TEXTOS, TEXTOS_EXITO } from '@/features/administracion/mensajes';
import { useEnvioUnico, type EnvioUnico } from '@/features/administracion/useEnvioUnico';
import { handlersAdministracion, reiniciarAdministracionMock } from '@/mocks/administracion';
import type { Organizacion } from '@/lib/contracts/administracion';

/* Sesión de administrador: el token lleva el rol que leen los mocks. */
let rolSesion: Rol = Rol.Administrador;

vi.mock('@/context/SessionContext', async () => {
  const { mockAccessToken: token } = await import('@/mocks/data');
  return {
    useSession: () => ({
      sesion: { accessToken: token(rolSesion) },
      usuario: { id: 'usr-demo-1', rol: rolSesion },
    }),
  };
});

const servidor = setupServer(...handlersAdministracion);

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  reiniciarAdministracionMock();
  rolSesion = Rol.Administrador;
});
afterEach(() => {
  cleanup();
  servidor.resetHandlers();
});
afterAll(() => servidor.close());

const puerto = crearAdministracionHttp();

/** Monta el árbol real: consultas, puerto HTTP y cerrojo de envío del padre. */
function Montaje({ children }: { readonly children: (envio: EnvioUnico) => ReactNode }) {
  const envio = useEnvioUnico();
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AdministracionProvider port={puerto}>{children(envio)}</AdministracionProvider>
    </QueryClientProvider>
  );
}

describe('E8-T19 · Bloque B con el adaptador real y los mocks', () => {
  it('lista usuarios con su organización y con respaldo para los datos que faltan', async () => {
    render(
      <Montaje>
        {() => <SeccionUsuarios onAbrirUsuario={() => {}} onNuevoUsuario={() => {}} />}
      </Montaje>,
    );

    expect(await screen.findByText('Ana Cliente')).toBeTruthy();
    expect(screen.getByText('Transportes Norte')).toBeTruthy();
    // SUJ-005 se dio de alta antes de tracer.40: sin nombre ni identificador.
    expect(screen.getByText(TEXTOS.usuarioSinNombre)).toBeTruthy();
  });

  it('da de alta un usuario interno y avisa el éxito', async () => {
    const onAlta = vi.fn();
    const user = userEvent.setup();
    render(
      <Montaje>
        {(envio) => (
          <AltaUsuarioDialog
            abierto
            onCerrar={() => {}}
            envio={envio}
            idEncabezadoSeccion="seccion"
            onAlta={onAlta}
          />
        )}
      </Montaje>,
    );

    await user.type(screen.getByLabelText(/Nombre/), 'Nuevo Supervisor');
    await user.type(screen.getByLabelText(/Identificador/), 'nuevo.supervisor');
    await user.click(screen.getByRole('radio', { name: 'Supervisor' }));
    await user.click(screen.getByRole('button', { name: TEXTOS.altaCrear }));

    await waitFor(() => expect(onAlta).toHaveBeenCalledWith(TEXTOS_EXITO.altaUsuario));
  });

  it('un identificador repetido se muestra junto a su campo y conserva lo capturado', async () => {
    const user = userEvent.setup();
    render(
      <Montaje>
        {(envio) => (
          <AltaUsuarioDialog
            abierto
            onCerrar={() => {}}
            envio={envio}
            idEncabezadoSeccion="seccion"
            onAlta={() => {}}
          />
        )}
      </Montaje>,
    );

    await user.type(screen.getByLabelText(/Nombre/), 'Lupita Duplicada');
    await user.type(screen.getByLabelText(/Identificador/), 'lupita.monitorista');
    await user.click(screen.getByRole('radio', { name: 'Monitorista' }));
    await user.click(screen.getByRole('button', { name: TEXTOS.altaCrear }));

    expect(await screen.findByText(TEXTOS.identificadorDuplicado)).toBeTruthy();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Lupita Duplicada');
  });

  it('un rol que no es administrador ve el aviso de permiso, sin cerrar la sesión', async () => {
    rolSesion = Rol.JefeOperativo;
    render(
      <Montaje>
        {() => <SeccionUsuarios onAbrirUsuario={() => {}} onNuevoUsuario={() => {}} />}
      </Montaje>,
    );

    expect(await screen.findByText(TEXTOS.sinAccesoConsulta)).toBeTruthy();
  });

  it('desactivar una organización muestra la consecuencia antes de confirmar y la aplica', async () => {
    const onCompletado = vi.fn();
    const organizacion: Organizacion = {
      id: 'ORG-001',
      nombre: 'Transportes Norte',
      correo: 'contacto@norte.mx',
      telefono: '5550001',
      activa: true,
      usuariosActivos: 1,
    };
    const user = userEvent.setup();
    render(
      <Montaje>
        {(envio) => (
          <DesactivarOrganizacionDialog
            abierto
            onCerrar={() => {}}
            organizacion={organizacion}
            envio={envio}
            idEncabezadoSeccion="seccion"
            onCompletado={onCompletado}
          />
        )}
      </Montaje>,
    );

    expect(await screen.findByText(TEXTOS.organizacionConsecuencia(1))).toBeTruthy();
    await user.click(screen.getByRole('button', { name: TEXTOS.desactivar }));

    await waitFor(() =>
      expect(onCompletado).toHaveBeenCalledWith(TEXTOS_EXITO.desactivarOrganizacion),
    );
  });
});
