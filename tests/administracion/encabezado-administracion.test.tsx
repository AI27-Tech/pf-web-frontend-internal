/*
 * E8-T19 · bloque 4.2 (adopción de `@ai27-tech/ui` 0.3.0-beta.1).
 *
 * `Administracion` usa `PageHeader` con el `id` y el `tabIndex` puestos en un `span`
 * dentro del título. Esta prueba fija tres cosas: el `h1` lo genera la librería, la
 * sección se nombra con el título y el foco llega al texto del título.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Rol } from '@ai27-tech/contracts/roles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AdministracionProvider } from '@/context/AdministracionContext';
import { Administracion } from '@/features/administracion/Administracion';

import { crearPuertoFalso } from './puertoFalso';

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

function renderizarAdministrador() {
  sesionActual = { usuario: { id: 'usr-admin', rol: Rol.Administrador } };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdministracionProvider port={crearPuertoFalso()}>
        <Administracion
          seccion="usuarios"
          usuarioId={null}
          onCambiarSeccion={() => {}}
          onAbrirUsuario={() => {}}
        />
      </AdministracionProvider>
    </QueryClientProvider>,
  );
}

describe('E8-T19 · bloque 4.2: encabezado de Administración', () => {
  it('el h1 lo genera PageHeader y contiene el texto con el id de foco', () => {
    renderizarAdministrador();

    const encabezado = screen.getByRole('heading', { level: 1, name: 'Administración' });
    const texto = document.getElementById('administracion-titulo');

    expect(texto).not.toBeNull();
    expect(encabezado.contains(texto)).toBe(true);
    expect(texto?.tabIndex).toBe(-1);
  });

  it('la sección se nombra con el título', () => {
    renderizarAdministrador();

    expect(screen.getByRole('region', { name: 'Administración' })).toBeTruthy();
  });

  it('el foco llega al texto del título', () => {
    renderizarAdministrador();

    const texto = document.getElementById('administracion-titulo');
    texto?.focus();

    expect(document.activeElement).toBe(texto);
  });
});
