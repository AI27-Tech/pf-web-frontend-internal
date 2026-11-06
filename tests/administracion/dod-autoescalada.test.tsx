/*
 * E8-T19 · DoD 2, parte de interfaz (R7.1, R7.2, R7.5; escenario 10).
 *
 * Con la sesión simulada como el propio objetivo, el cambio de rol y de alcance
 * quedan deshabilitados con el motivo visible y no se emite ninguna solicitud por
 * ningún medio. Con un identificador no comparable (`indeterminado`), ocurre lo
 * mismo con el aviso de sesión no identificable. La prueba de que el servidor
 * rechaza con `403` queda en la tarea 17.6 y en la 19.4.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Rol } from '@ai27-tech/contracts/roles';

import { useSession } from '@/context/SessionContext';
import { AccionesUsuario, type AccionUsuario } from '@/features/administracion/AccionesUsuario';
import { relacionConSesion } from '@/features/administracion/relacionConSesion';
import { TEXTOS_ADMINISTRACION as TEXTOS } from '@/features/administracion/mensajes';
import type { UsuarioResumen } from '@/lib/contracts/administracion';

let sesionActual: { usuario: { id: string; rol: Rol } } | null = null;

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: sesionActual,
    usuario: sesionActual?.usuario ?? null,
  }),
}));

afterEach(() => {
  cleanup();
  sesionActual = null;
});

/** Panel mínimo que calcula la relación con la sesión real del contexto. */
function PanelDeUsuario({
  usuario,
  onAccion,
}: {
  readonly usuario: UsuarioResumen;
  readonly onAccion: (accion: AccionUsuario) => void;
}) {
  const { sesion } = useSession();
  const relacion = relacionConSesion(usuario, sesion);
  return (
    <AccionesUsuario usuario={usuario} relacion={relacion} enCurso={false} onAccion={onAccion} />
  );
}

const usuarioBase: UsuarioResumen = {
  id: 'usr-objetivo',
  nombre: 'Monitorista de prueba',
  identificadorUsuario: 'monitorista.prueba',
  rol: Rol.Monitorista,
  activo: true,
};

describe('E8-T19 · DoD 2 (interfaz): el propio rol y alcance no se pueden modificar', () => {
  it('objetivo propio: rol y alcance deshabilitados, motivo visible, sin solicitudes', async () => {
    sesionActual = { usuario: { id: 'sub-propio', rol: Rol.Administrador } };
    const usuario = { ...usuarioBase, idpSubject: 'sub-propio' };
    const onAccion = vi.fn();
    const user = userEvent.setup();

    render(<PanelDeUsuario usuario={usuario} onAccion={onAccion} />);

    const cambiarRol = screen.getByRole('button', { name: 'Cambiar rol' });
    const editarAlcance = screen.getByRole('button', { name: 'Editar alcance' });
    expect(cambiarRol).toBeDisabled();
    expect(editarAlcance).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent(TEXTOS.propioRolAlcance);

    await user.click(cambiarRol);
    await user.click(editarAlcance);

    expect(onAccion).not.toHaveBeenCalled();
  });

  it('objetivo propio: la revocación no se ofrece y remite al cierre de sesión', () => {
    sesionActual = { usuario: { id: 'sub-propio', rol: Rol.Administrador } };
    render(
      <PanelDeUsuario usuario={{ ...usuarioBase, idpSubject: 'sub-propio' }} onAccion={vi.fn()} />,
    );

    expect(screen.queryByRole('button', { name: 'Revocar sesiones' })).toBeNull();
    expect(screen.getByText(TEXTOS.propioRevocacion)).toBeTruthy();
  });

  it('identificador no comparable (indeterminado): mismo bloqueo con el aviso de sesión no identificable', async () => {
    sesionActual = { usuario: { id: 'sub-sesion', rol: Rol.Administrador } };
    const onAccion = vi.fn();
    const user = userEvent.setup();

    render(<PanelDeUsuario usuario={{ ...usuarioBase, idpSubject: null }} onAccion={onAccion} />);

    const cambiarRol = screen.getByRole('button', { name: 'Cambiar rol' });
    expect(cambiarRol).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Editar alcance' })).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent(TEXTOS.sinIdentificarSesion);

    await user.click(cambiarRol);

    expect(onAccion).not.toHaveBeenCalled();
  });

  it('control positivo: un objetivo ajeno sí dispara la solicitud de cambio de rol', async () => {
    sesionActual = { usuario: { id: 'sub-otro', rol: Rol.Administrador } };
    const onAccion = vi.fn();
    const user = userEvent.setup();

    render(
      <PanelDeUsuario usuario={{ ...usuarioBase, idpSubject: 'sub-propio' }} onAccion={onAccion} />,
    );

    const cambiarRol = screen.getByRole('button', { name: 'Cambiar rol' });
    expect(cambiarRol).toBeEnabled();

    await user.click(cambiarRol);

    expect(onAccion).toHaveBeenCalledWith('cambiarRol');
  });
});
