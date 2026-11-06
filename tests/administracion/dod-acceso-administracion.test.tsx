/*
 * E8-T19 · DoD 1 (R1.1, R1.2, R1.3; escenario 9).
 *
 * Para cada uno de los siete roles distintos de `administrador` y para "sin
 * sesión": la navegación no muestra "Administración", la pantalla muestra el
 * aviso de acceso no autorizado, no hay controles de asignación de rol ni de
 * alcance y el puerto no recibe llamadas.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Rol, ROLES } from '@ai27-tech/contracts/roles';

import { entradasVisiblesPara } from '@/components/layout/navigationConfig';
import { AdministracionProvider } from '@/context/AdministracionContext';
import { Administracion } from '@/features/administracion/Administracion';
import { TEXTOS_ADMINISTRACION as TEXTOS } from '@/features/administracion/mensajes';

import { crearPuertoFalso } from './puertoFalso';

interface SesionDePrueba {
  readonly usuario: { readonly id: string; readonly rol: Rol };
}

let sesionActual: SesionDePrueba | null = null;

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

function renderizarPagina(capacidadesPublicadas = true) {
  const puerto = crearPuertoFalso({
    usuarios: capacidadesPublicadas,
    organizaciones: capacidadesPublicadas,
    alcance: capacidadesPublicadas,
    revocacionMasiva: capacidadesPublicadas,
  });
  render(
    <AdministracionProvider port={puerto}>
      <Administracion seccion="usuarios" usuarioId={null} onCambiarSeccion={() => {}} />
    </AdministracionProvider>,
  );
  return puerto;
}

function sinLlamadasAlPuerto(puerto: ReturnType<typeof crearPuertoFalso>) {
  for (const espia of Object.values(puerto.espias)) {
    expect(espia).not.toHaveBeenCalled();
  }
}

const OTROS_ROLES = ROLES.filter((rol) => rol !== Rol.Administrador);

describe('E8-T19 · DoD 1: acceso a Administración solo para administrador', () => {
  describe.each(OTROS_ROLES)('rol %s', (rol) => {
    it('la navegación no muestra "Administración"', () => {
      const etiquetas = entradasVisiblesPara(rol).map((item) => item.label);

      expect(etiquetas).not.toContain('Administración');
    });

    it('la pantalla muestra el aviso de acceso no autorizado y no monta controles', () => {
      sesionActual = { usuario: { id: `usr-${rol}`, rol } };
      const puerto = renderizarPagina();

      expect(screen.getByRole('alert')).toHaveTextContent(TEXTOS.accesoNoAutorizado);
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
      expect(screen.queryByRole('button', { name: /cambiar rol/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /editar alcance/i })).toBeNull();
      expect(screen.queryByRole('navigation', { name: /secciones de administración/i })).toBeNull();
      sinLlamadasAlPuerto(puerto);
    });
  });

  it('sin sesión, la pantalla muestra el aviso y no monta controles ni llama al puerto', () => {
    sesionActual = null;
    const puerto = renderizarPagina();

    expect(screen.getByRole('alert')).toHaveTextContent(TEXTOS.accesoNoAutorizado);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.queryByRole('navigation', { name: /secciones de administración/i })).toBeNull();
    sinLlamadasAlPuerto(puerto);
  });

  it('control positivo: el administrador sí ve las secciones y no el aviso', () => {
    sesionActual = { usuario: { id: 'usr-admin', rol: Rol.Administrador } };
    renderizarPagina();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('navigation', { name: /secciones de administración/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Usuarios' })).toBeTruthy();
  });
});
