/*
 * Cuenta y configuración desde la barra lateral.
 *
 * "Cerrar sesión" ya no está en la barra: vive en el modal que abre el grupo
 * "Cuenta". El modal muestra el usuario, cambia el tema y cierra la sesión.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Rol } from '@ai27-tech/contracts/roles';

import type { Usuario } from '@/lib/contracts';
import { ConfiguracionModal } from '@/components/layout/ConfiguracionModal';
import { NavigationSidebar } from '@/components/layout/NavigationSidebar';

const logout = vi.fn();
let usuarioActual: Usuario | null = null;

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({ usuario: usuarioActual, logout }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children?: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/' }),
}));

const usuario = { id: 'ana.lopez', rol: Rol.Administrador, audiencia: 'Interno' as const };

beforeEach(() => {
  usuarioActual = usuario;
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  cleanup();
  logout.mockClear();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('ConfiguracionModal', () => {
  it('muestra el usuario y su rol', () => {
    render(<ConfiguracionModal open onClose={vi.fn()} usuario={usuario} onLogout={logout} />);

    expect(screen.getByText('ana.lopez')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('marca el tema guardado y cambia el tema al elegir otro', async () => {
    const usuarioEvento = userEvent.setup();
    localStorage.setItem('ai27.tema', 'oscuro');
    render(<ConfiguracionModal open onClose={vi.fn()} usuario={usuario} onLogout={logout} />);

    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeChecked();

    await usuarioEvento.click(screen.getByRole('radio', { name: 'Claro' }));

    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('ai27.tema')).toBe('claro');
  });

  it('cierra el modal y cierra la sesión al pulsar "Cerrar sesión"', async () => {
    const usuarioEvento = userEvent.setup();
    const onClose = vi.fn();
    render(<ConfiguracionModal open onClose={onClose} usuario={usuario} onLogout={logout} />);

    await usuarioEvento.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledTimes(1);
  });
});

describe('NavigationSidebar · cuenta', () => {
  const noop = () => {};

  it('la barra no muestra "Cerrar sesión" hasta abrir la configuración', async () => {
    const usuarioEvento = userEvent.setup();
    render(<NavigationSidebar collapsed={false} onToggleCollapse={noop} onLogout={logout} />);

    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();

    await usuarioEvento.click(screen.getByRole('button', { name: 'Configuración' }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('el grupo "Cuenta" aparece con la entrada de configuración', () => {
    render(<NavigationSidebar collapsed={false} onToggleCollapse={noop} onLogout={logout} />);

    expect(screen.getByText('Cuenta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configuración' })).toBeInTheDocument();
  });
});
