/*
 * Visibilidad de la navegación por rol (spec `afinacion-roles-modulo-a-modulo`, M1).
 *
 * Lista blanca: la entrada aparece solo para los roles que la matriz nombra.
 * La negación real la hace el bff. `cotizacion` solo ve Solicitudes (escenario E14).
 *
 * E8-T19 (R1.1–R1.3): "Administración" solo la ve el rol `administrador`.
 */

import { describe, expect, it } from 'vitest';
import { Rol } from '@ai27-tech/contracts/roles';

import { entradasVisiblesPara, type NavItem } from '@/components/layout/navigationConfig';
import { ROLES_INTERNOS } from '@/lib/permisos/roles';

/** Etiquetas visibles para un rol, en orden. */
function labels(rol: Rol): string[] {
  return entradasVisiblesPara(rol).map((item: NavItem) => item.label);
}

const MENU_ESPERADO: Record<string, string[]> = {
  [Rol.JefeOperativo]: ['Panel', 'Solicitudes', 'Viajes', 'Roster', 'Catálogos'],
  [Rol.Cotizacion]: ['Solicitudes'],
  [Rol.Monitorista]: ['Dashboard', 'Viajes', 'Reportes'],
  [Rol.Supervisor]: ['Dashboard', 'Viajes', 'Conversaciones', 'Emergencias', 'Reportes'],
  [Rol.Coordinador]: [
    'Dashboard',
    'Viajes',
    'Conversaciones',
    'Emergencias',
    'Catálogos',
    'Reportes',
  ],
  [Rol.Administrador]: [
    'Panel',
    'Solicitudes',
    'Dashboard',
    'Viajes',
    'Roster',
    'Conversaciones',
    'Catálogos',
    'Reportes',
    'Administración',
  ],
  [Rol.Ejecutivo]: ['Conversaciones'],
  [Rol.Reaccion]: ['Emergencias'],
};

describe('M1 · menú por rol según la matriz', () => {
  it('la tabla esperada cubre todos los roles internos', () => {
    expect(Object.keys(MENU_ESPERADO).sort()).toEqual([...ROLES_INTERNOS].sort());
  });

  it.each(Object.entries(MENU_ESPERADO))('%s ve exactamente su menú', (rol, esperado) => {
    expect(labels(rol as Rol)).toEqual(esperado);
  });

  it('Reacción no ve Reportes ni Catálogos (DEC-022 #9)', () => {
    expect(labels(Rol.Reaccion)).not.toContain('Reportes');
    expect(labels(Rol.Reaccion)).not.toContain('Catálogos');
  });

  it('Roster solo lo ven el Jefe Operativo y el Administrador (E8-T21, DEC-142 #3)', () => {
    const conRoster = ROLES_INTERNOS.filter((rol) => labels(rol).includes('Roster'));
    expect(conRoster).toEqual([Rol.JefeOperativo, Rol.Administrador]);
  });

  it('un rol que la política no conoce no ve ninguna entrada', () => {
    expect(entradasVisiblesPara('rol_futuro' as Rol)).toEqual([]);
  });

  it('el cliente no ve ninguna entrada del panel interno', () => {
    expect(entradasVisiblesPara(Rol.Cliente)).toEqual([]);
  });
});

describe('E8-T19 · Administración visible solo para administrador (R1.1, R1.3)', () => {
  it('solo el administrador ve la entrada "Administración"', () => {
    const conAdministracion = ROLES_INTERNOS.filter((rol) =>
      labels(rol).includes('Administración'),
    );

    expect(conAdministracion).toEqual([Rol.Administrador]);
  });
});
