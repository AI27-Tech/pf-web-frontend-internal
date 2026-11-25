/*
 * M1 · acceso directo por URL (spec `afinacion-roles-modulo-a-modulo`, escenarios E7 y E14).
 *
 * Un rol sin la capacidad ve "sin permiso", la pantalla no se monta (así sus
 * hooks de datos no piden nada) y la sesión no se toca.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { puede, type Capacidad } from '@/lib/permisos';
import { ROLES_INTERNOS } from '@/lib/permisos/roles';

let rolActual: string | null = null;
const logout = vi.fn();

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: rolActual ? { usuario: { id: 'u-1', rol: rolActual } } : null,
    usuario: rolActual ? { id: 'u-1', rol: rolActual } : null,
    logout,
  }),
}));

afterEach(() => {
  cleanup();
  rolActual = null;
  logout.mockClear();
});

/** Capacidades que guardan las rutas de la matriz M1 (y /catalogos y /reportes, de M13). */
const RUTAS_GUARDADAS: ReadonlyArray<readonly [string, Capacidad]> = [
  ['/roster', 'roster.ver'],
  ['/catalogos', 'catalogos.ver'],
  ['/reportes', 'reportes.ver'],
  ['/solicitudes', 'solicitud.listar'],
  ['/administracion', 'administracion.usuarios'],
  ['/jefe-operativo/panel', 'panel.jefeOperativo'],
  ['/monitoreo/dashboard', 'monitoreo.dashboard'],
  ['/viajes/crear', 'viaje.crear'],
  ['/viajes', 'viajes.listar'],
  ['/viajes/$id', 'viaje.ver'],
  ['/viajes/$id/ficha', 'viaje.ficha.ver'],
  ['/viajes/$id/historico', 'viaje.historico.ver'],
  ['/viajes/$id/expediente', 'monitoreo.consultar'],
];

function renderizar(capacidad: Capacidad, alMontar: () => void) {
  function Pantalla() {
    useEffect(alMontar, []);
    return <p>contenido de la pantalla</p>;
  }
  render(
    <RequiereCapacidad capacidad={capacidad}>
      <Pantalla />
    </RequiereCapacidad>,
  );
}

describe.each(RUTAS_GUARDADAS)('ruta %s (%s)', (_ruta, capacidad) => {
  it.each(ROLES_INTERNOS.map((rol) => [rol] as const))('%s', (rol) => {
    rolActual = rol;
    const montado = vi.fn();
    renderizar(capacidad, montado);

    if (puede(rol, capacidad)) {
      expect(screen.getByText('contenido de la pantalla')).toBeInTheDocument();
      expect(montado).toHaveBeenCalledTimes(1);
    } else {
      expect(screen.getByText('Sin permiso')).toBeInTheDocument();
      expect(screen.queryByText('contenido de la pantalla')).not.toBeInTheDocument();
      expect(montado).not.toHaveBeenCalled();
    }
    expect(logout).not.toHaveBeenCalled();
  });
});

describe('RequiereCapacidad sin sesión o con rol desconocido', () => {
  it('niega sin sesión', () => {
    renderizar('viajes.listar', vi.fn());
    expect(screen.getByText('Sin permiso')).toBeInTheDocument();
  });

  it('niega a un rol que la política no conoce', () => {
    rolActual = 'rol_futuro';
    renderizar('viajes.listar', vi.fn());
    expect(screen.getByText('Sin permiso')).toBeInTheDocument();
  });
});
