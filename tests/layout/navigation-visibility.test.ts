/*
 * E8-T4 — Definición de terminado: "la navegación compuesta para un rol Reacción
 * no incluye Reportes ni Catálogos".
 *
 * Verifica la afordancia de UI que compone las entradas según el rol. La regla
 * explícita de la tarea es la de Reacción (DEC-022 #9); se comprueba además que
 * el resto de roles internos sí ve sus áreas, porque la negación real la
 * hace el bff, no esta lista.
 *
 * E8-T19 (R1.1–R1.3): "Administración" solo la ve el rol `administrador`.
 */

import { describe, expect, it } from 'vitest';
import { Rol, ROLES } from '@ai27-tech/contracts/roles';

import { entradasVisiblesPara, type NavItem } from '@/components/layout/navigationConfig';

/** Etiquetas visibles para un rol, en orden. */
function labels(rol: Rol): string[] {
  return entradasVisiblesPara(rol).map((item: NavItem) => item.label);
}

describe('E8-T4 · visibilidad de navegación por rol', () => {
  it('Reacción NO ve Reportes ni Catálogos', () => {
    const visibles = labels(Rol.Reaccion);

    expect(visibles).not.toContain('Reportes');
    expect(visibles).not.toContain('Catálogos');
  });

  it('Reacción sí ve el resto de áreas (Viajes, Conversaciones, Emergencias)', () => {
    const visibles = labels(Rol.Reaccion);

    expect(visibles).toEqual(['Viajes', 'Conversaciones', 'Emergencias']);
  });

  it('el administrador ve las ocho entradas, con Dashboard, Roster y Administración', () => {
    expect(labels(Rol.Administrador)).toEqual([
      'Dashboard',
      'Viajes',
      'Roster',
      'Conversaciones',
      'Emergencias',
      'Catálogos',
      'Reportes',
      'Administración',
    ]);
  });

  it('un rol interno sin restricción (monitorista) no ve Administración', () => {
    expect(labels(Rol.Monitorista)).toEqual([
      'Dashboard',
      'Viajes',
      'Conversaciones',
      'Emergencias',
      'Catálogos',
      'Reportes',
    ]);
  });

  it('Roster solo lo ven el Jefe Operativo y el Administrador (E8-T21, DEC-142 #3)', () => {
    expect(labels(Rol.JefeOperativo)).toContain('Roster');
    for (const rol of [
      Rol.Monitorista,
      Rol.Supervisor,
      Rol.Coordinador,
      Rol.Ejecutivo,
      Rol.Reaccion,
    ]) {
      expect(labels(rol)).not.toContain('Roster');
    }
  });
});

describe('E8-T19 · Administración visible solo para administrador (R1.1, R1.3)', () => {
  it('solo el administrador ve la entrada "Administración"', () => {
    const conAdministracion = ROLES.filter((rol) => labels(rol).includes('Administración'));

    expect(conAdministracion).toEqual([Rol.Administrador]);
  });

  it('los siete roles distintos de administrador no ven Administración', () => {
    const otros = ROLES.filter((rol) => rol !== Rol.Administrador);

    for (const rol of otros) {
      expect(labels(rol)).not.toContain('Administración');
    }
  });
});
