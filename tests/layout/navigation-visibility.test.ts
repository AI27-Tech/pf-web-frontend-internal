/*
 * E8-T4 — Definición de terminado: "la navegación compuesta para un rol Reacción
 * no incluye Reportes ni Catálogos".
 *
 * Verifica la afordancia de UI que compone las entradas según el rol. La regla
 * explícita de la tarea es la de Reacción (DEC-022 #9); se comprueba además que
 * el resto de roles internos sí ve las seis áreas, porque la negación real la
 * hace el bff, no esta lista.
 */

import { describe, expect, it } from 'vitest';
import { Rol } from '@ai27-tech/contracts/roles';

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

  it('Reacción sí ve el resto de áreas (Viajes, Conversaciones, Emergencias, Administración)', () => {
    const visibles = labels(Rol.Reaccion);

    expect(visibles).toEqual(['Viajes', 'Conversaciones', 'Emergencias', 'Administración']);
  });

  it('el administrador ve las seis áreas', () => {
    expect(labels(Rol.Administrador)).toEqual([
      'Viajes',
      'Conversaciones',
      'Emergencias',
      'Catálogos',
      'Reportes',
      'Administración',
    ]);
  });

  it('un rol interno sin restricción (monitorista) ve las seis áreas', () => {
    expect(labels(Rol.Monitorista)).toEqual([
      'Viajes',
      'Conversaciones',
      'Emergencias',
      'Catálogos',
      'Reportes',
      'Administración',
    ]);
  });
});
