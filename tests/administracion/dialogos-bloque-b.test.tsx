/*
 * E8-T19 · Diálogos del Bloque B contra el puerto falso (tareas 11.1, 12.1, 14.1,
 * 15.1 y la parte de interfaz de la 17.6). Ninguna prueba consume datos reales:
 * los diálogos reciben el usuario por props y el puerto es un espía.
 */

import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Rol } from '@ai27-tech/contracts/roles';

import { AdministracionProvider } from '@/context/AdministracionContext';
import { ApiError } from '@/lib/api/errors';
import type { Organizacion, UsuarioResumen } from '@/lib/contracts/administracion';
import { CambioRolDialog } from '@/features/administracion/CambioRolDialog';
import { DesactivarUsuarioDialog } from '@/features/administracion/DesactivarUsuarioDialog';
import { OrganizacionFormDialog } from '@/features/administracion/OrganizacionFormDialog';
import { RevocarSesionesDialog } from '@/features/administracion/RevocarSesionesDialog';
import { TEXTOS_ADMINISTRACION as TEXTOS, TEXTOS_EXITO } from '@/features/administracion/mensajes';
import { useEnvioUnico, type EnvioUnico } from '@/features/administracion/useEnvioUnico';

import { crearPuertoFalso, type PuertoFalso } from './puertoFalso';

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-prueba', usuario: { id: 'sub-admin', rol: 'administrador' } },
    usuario: { id: 'sub-admin', rol: 'administrador' },
  }),
}));

afterEach(() => {
  cleanup();
});

/** Monta un diálogo con el cerrojo de envío que el padre le entregaría. */
function Contenedor({
  puerto,
  montar,
}: {
  readonly puerto: PuertoFalso;
  readonly montar: (envio: EnvioUnico) => ReactNode;
}) {
  const envio = useEnvioUnico();
  return <AdministracionProvider port={puerto}>{montar(envio)}</AdministracionProvider>;
}

const usuarioInterno: UsuarioResumen = {
  id: 'usr-1',
  nombre: 'Lupita Prueba',
  identificadorUsuario: 'lupita.prueba',
  rol: Rol.Monitorista,
  activo: true,
  esPropio: false,
};

const usuarioCliente: UsuarioResumen = {
  ...usuarioInterno,
  id: 'usr-cliente',
  rol: Rol.Cliente,
  organizacion: { id: 'org-1', nombre: 'Transportes Norte' },
};

describe('E8-T19 · 11.1 CambioRolDialog', () => {
  it('a un cliente no se le cambia el rol: no hay opciones y lo dice', () => {
    const puerto = crearPuertoFalso();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <CambioRolDialog
            abierto
            onCerrar={vi.fn()}
            usuario={usuarioCliente}
            relacion="ajeno"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onCambiado={vi.fn()}
          />
        )}
      />,
    );

    expect(screen.getByText(TEXTOS.cambioRolDeClienteNoEditable)).toBeTruthy();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('a un interno solo se ofrecen roles internos', () => {
    const puerto = crearPuertoFalso();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <CambioRolDialog
            abierto
            onCerrar={vi.fn()}
            usuario={usuarioInterno}
            relacion="ajeno"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onCambiado={vi.fn()}
          />
        )}
      />,
    );

    expect(screen.queryByRole('radio', { name: 'Cliente' })).toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(7);
  });

  it('avisa el retiro del alcance al elegir otro rol, con alcance actual (DEC-140)', async () => {
    const puerto = crearPuertoFalso();
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <CambioRolDialog
            abierto
            onCerrar={vi.fn()}
            usuario={usuarioInterno}
            relacion="ajeno"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onCambiado={vi.fn()}
          />
        )}
      />,
    );

    expect(screen.queryByText(TEXTOS.cambioRolRetiraAlcance)).toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Supervisor' }));

    expect(screen.getByText(TEXTOS.cambioRolRetiraAlcance)).toBeTruthy();
  });

  it('no envía hasta confirmar y luego envía el rol elegido una sola vez', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.fijarRol.mockResolvedValue(undefined);
    const onCambiado = vi.fn();
    const onCerrar = vi.fn();
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <CambioRolDialog
            abierto
            onCerrar={onCerrar}
            usuario={usuarioInterno}
            relacion="ajeno"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onCambiado={onCambiado}
          />
        )}
      />,
    );

    const confirmar = screen.getByRole('button', { name: 'Cambiar rol' });
    expect(confirmar).toBeDisabled();
    expect(puerto.espias.fijarRol).not.toHaveBeenCalled();

    await user.click(screen.getByRole('radio', { name: 'Supervisor' }));
    await user.click(confirmar);

    expect(puerto.espias.fijarRol).toHaveBeenCalledTimes(1);
    expect(puerto.espias.fijarRol).toHaveBeenCalledWith('usr-1', Rol.Supervisor, 'token-prueba');
    expect(onCambiado).toHaveBeenCalledWith(TEXTOS_EXITO.cambioRol);
    expect(onCerrar).toHaveBeenCalled();
  });

  it('un 409 por rol igual muestra su motivo y conserva el rol elegido', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.fijarRol.mockRejectedValue(
      new ApiError('conflicto', 'PUT → 409', 409, 'rol_igual'),
    );
    const onCerrar = vi.fn();
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <CambioRolDialog
            abierto
            onCerrar={onCerrar}
            usuario={usuarioInterno}
            relacion="ajeno"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onCambiado={vi.fn()}
          />
        )}
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'Supervisor' }));
    await user.click(screen.getByRole('button', { name: 'Cambiar rol' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(TEXTOS.conflictoRolIgual);
    expect(onCerrar).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Supervisor' })).toBeChecked();
  });

  it('un 403 muestra "no tiene permiso" y el diálogo sigue abierto', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.fijarRol.mockRejectedValue(new ApiError('prohibido', 'PUT → 403', 403));
    const onCerrar = vi.fn();
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <CambioRolDialog
            abierto
            onCerrar={onCerrar}
            usuario={usuarioInterno}
            relacion="ajeno"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onCambiado={vi.fn()}
          />
        )}
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'Supervisor' }));
    await user.click(screen.getByRole('button', { name: 'Cambiar rol' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(TEXTOS.autorizacionInsuficiente);
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('con relación propio no se puede confirmar ningún cambio', async () => {
    const puerto = crearPuertoFalso();
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <CambioRolDialog
            abierto
            onCerrar={vi.fn()}
            usuario={usuarioInterno}
            relacion="propio"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onCambiado={vi.fn()}
          />
        )}
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'Supervisor' }));

    expect(screen.getByRole('button', { name: 'Cambiar rol' })).toBeDisabled();
    expect(puerto.espias.fijarRol).not.toHaveBeenCalled();
  });
});

describe('E8-T19 · 12.1 DesactivarUsuarioDialog', () => {
  it('no envía antes de confirmar y desactiva con el corte de 30 segundos a la vista', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.desactivarUsuario.mockResolvedValue(undefined);
    const onCompletado = vi.fn();
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <DesactivarUsuarioDialog
            abierto
            onCerrar={vi.fn()}
            usuario={usuarioInterno}
            modo="desactivar"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onCompletado={onCompletado}
          />
        )}
      />,
    );

    expect(screen.getByText(TEXTOS.desactivarCorte)).toBeTruthy();
    expect(puerto.espias.desactivarUsuario).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(puerto.espias.desactivarUsuario).toHaveBeenCalledWith('usr-1', 'token-prueba');
    expect(onCompletado).toHaveBeenCalledWith(TEXTOS_EXITO.desactivarUsuario);
  });

  it('el último administrador se explica con el motivo del bff y el usuario sigue activo', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.desactivarUsuario.mockRejectedValue(
      new ApiError('conflicto', 'DELETE → 409', 409, 'ultimo_administrador'),
    );
    const onCerrar = vi.fn();
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <DesactivarUsuarioDialog
            abierto
            onCerrar={onCerrar}
            usuario={usuarioInterno}
            modo="desactivar"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onCompletado={vi.fn()}
          />
        )}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(TEXTOS.ultimoAdministrador);
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('reactivar llama a reactivarUsuario y no muestra el aviso de corte', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.reactivarUsuario.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <DesactivarUsuarioDialog
            abierto
            onCerrar={vi.fn()}
            usuario={{ ...usuarioInterno, activo: false }}
            modo="reactivar"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onCompletado={vi.fn()}
          />
        )}
      />,
    );

    expect(screen.queryByText(TEXTOS.desactivarCorte)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reactivar' }));

    expect(puerto.espias.reactivarUsuario).toHaveBeenCalledWith('usr-1', 'token-prueba');
    expect(puerto.espias.desactivarUsuario).not.toHaveBeenCalled();
  });
});

const organizacionActiva: Organizacion = {
  id: 'org-1',
  nombre: 'Transportes Norte',
  correo: 'contacto@norte.mx',
  telefono: '5550001',
  activa: true,
  usuariosActivos: 0,
};

describe('E8-T19 · 14.1 OrganizacionFormDialog', () => {
  it('no envía con campos vacíos y marca cada campo obligatorio', async () => {
    const puerto = crearPuertoFalso();
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <OrganizacionFormDialog
            abierto
            onCerrar={vi.fn()}
            envio={envio}
            idEncabezadoSeccion="seccion"
            onGuardada={vi.fn()}
          />
        )}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Capture el nombre de la organización.')).toBeTruthy();
    expect(puerto.espias.crearOrganizacion).not.toHaveBeenCalled();
  });

  it('rechaza un correo sin @', async () => {
    const puerto = crearPuertoFalso();
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <OrganizacionFormDialog
            abierto
            onCerrar={vi.fn()}
            envio={envio}
            idEncabezadoSeccion="seccion"
            onGuardada={vi.fn()}
          />
        )}
      />,
    );

    await user.type(screen.getByLabelText(/Nombre/), 'Acme');
    await user.type(screen.getByLabelText(/Correo/), 'sinarroba.mx');
    await user.type(screen.getByLabelText(/Teléfono/), '5551234');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El correo debe incluir @.')).toBeTruthy();
    expect(puerto.espias.crearOrganizacion).not.toHaveBeenCalled();
  });

  it('crea con los datos sin espacios sobrantes', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.crearOrganizacion.mockResolvedValue(organizacionActiva);
    const onGuardada = vi.fn();
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <OrganizacionFormDialog
            abierto
            onCerrar={vi.fn()}
            envio={envio}
            idEncabezadoSeccion="seccion"
            onGuardada={onGuardada}
          />
        )}
      />,
    );

    await user.type(screen.getByLabelText(/Nombre/), '  Acme  ');
    await user.type(screen.getByLabelText(/Correo/), 'ventas@acme.mx');
    await user.type(screen.getByLabelText(/Teléfono/), '5551234');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    // El id del alta lo genera el panel al abrir el diálogo (DEC-144 #2).
    expect(puerto.espias.crearOrganizacion).toHaveBeenCalledWith(
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        nombre: 'Acme',
        correo: 'ventas@acme.mx',
        telefono: '5551234',
      },
      'token-prueba',
    );
    expect(onGuardada).toHaveBeenCalledWith(TEXTOS_EXITO.guardarOrganizacion);
  });

  it('un nombre duplicado conserva lo capturado', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.crearOrganizacion.mockRejectedValue(
      new ApiError('conflicto', 'POST → 409', 409, 'nombre_organizacion_duplicado'),
    );
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <OrganizacionFormDialog
            abierto
            onCerrar={vi.fn()}
            envio={envio}
            idEncabezadoSeccion="seccion"
            onGuardada={vi.fn()}
          />
        )}
      />,
    );

    await user.type(screen.getByLabelText(/Nombre/), 'Acme');
    await user.type(screen.getByLabelText(/Correo/), 'ventas@acme.mx');
    await user.type(screen.getByLabelText(/Teléfono/), '5551234');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(TEXTOS.nombreOrganizacionDuplicado);
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Acme');
    expect(screen.getByLabelText(/Correo/)).toHaveValue('ventas@acme.mx');
  });

  it('edita con los datos actuales, muestra el tenant en solo lectura y no ofrece reactivar', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.editarOrganizacion.mockResolvedValue(organizacionActiva);
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <OrganizacionFormDialog
            abierto
            onCerrar={vi.fn()}
            organizacion={organizacionActiva}
            envio={envio}
            idEncabezadoSeccion="seccion"
            onGuardada={vi.fn()}
          />
        )}
      />,
    );

    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Transportes Norte');
    expect(screen.getByText(/org-1/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /reactivar/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(puerto.espias.editarOrganizacion).toHaveBeenCalledWith(
      'org-1',
      { nombre: 'Transportes Norte', correo: 'contacto@norte.mx', telefono: '5550001' },
      'token-prueba',
    );
  });
});

describe('E8-T19 · 15.1 RevocarSesionesDialog', () => {
  it('con relación propio no ofrece la revocación y remite al cierre de sesión', () => {
    const puerto = crearPuertoFalso();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <RevocarSesionesDialog
            abierto
            onCerrar={vi.fn()}
            usuario={usuarioInterno}
            relacion="propio"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onResultado={vi.fn()}
          />
        )}
      />,
    );

    expect(screen.getByText(TEXTOS.propioRevocacion)).toBeTruthy();
    expect(screen.queryByLabelText(/Motivo/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Revocar sesiones' })).toBeDisabled();
  });

  it('el motivo es obligatorio: sin texto no se puede confirmar, con espacios tampoco', async () => {
    const puerto = crearPuertoFalso();
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <RevocarSesionesDialog
            abierto
            onCerrar={vi.fn()}
            usuario={usuarioInterno}
            relacion="ajeno"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onResultado={vi.fn()}
          />
        )}
      />,
    );

    const confirmar = screen.getByRole('button', { name: 'Revocar sesiones' });
    expect(confirmar).toBeDisabled();

    await user.type(screen.getByLabelText(/Motivo/), '   ');
    expect(confirmar).toBeDisabled();
    expect(puerto.espias.revocarSesiones).not.toHaveBeenCalled();
  });

  it('revoca con el motivo sin espacios y muestra "sin sesiones" tal como lo devuelve el bff', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.revocarSesiones.mockResolvedValue({ sesionesRevocadas: 0 });
    const onResultado = vi.fn();
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <RevocarSesionesDialog
            abierto
            onCerrar={vi.fn()}
            usuario={usuarioInterno}
            relacion="ajeno"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onResultado={onResultado}
          />
        )}
      />,
    );

    await user.type(screen.getByLabelText(/Motivo/), '  Equipo comprometido  ');
    await user.click(screen.getByRole('button', { name: 'Revocar sesiones' }));

    expect(puerto.espias.revocarSesiones).toHaveBeenCalledWith(
      'usr-1',
      'Equipo comprometido',
      'token-prueba',
    );
    expect(onResultado).toHaveBeenCalledWith(TEXTOS.revocacionSinSesiones);
  });

  it('ante falta de respuesta dice que no se pudo confirmar', async () => {
    const puerto = crearPuertoFalso();
    puerto.espias.revocarSesiones.mockRejectedValue(new ApiError('red', 'sin respuesta'));
    const user = userEvent.setup();
    render(
      <Contenedor
        puerto={puerto}
        montar={(envio) => (
          <RevocarSesionesDialog
            abierto
            onCerrar={vi.fn()}
            usuario={usuarioInterno}
            relacion="ajeno"
            envio={envio}
            idEncabezadoSeccion="seccion"
            onResultado={vi.fn()}
          />
        )}
      />,
    );

    await user.type(screen.getByLabelText(/Motivo/), 'Prueba');
    await user.click(screen.getByRole('button', { name: 'Revocar sesiones' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('no se pudo confirmar');
  });
});
