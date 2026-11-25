/*
 * Agrupación de la barra lateral por área (Inicio, Operación, Gestión).
 *
 * Cada entrada pertenece a un solo grupo. Un rol ve solo los grupos que tienen
 * al menos una entrada visible para él.
 */
import { describe, expect, it } from 'vitest';
import { Rol } from '@ai27-tech/contracts/roles';
import { gruposVisiblesPara, NAV_ITEMS } from '@/components/layout/navigationConfig';
import { ROLES_INTERNOS } from '@/lib/permisos/roles';

/** Grupos visibles para un rol, como pares [etiqueta del grupo, etiquetas de sus entradas]. */
function resumen(rol: Rol): [string, string[]][] {
  return gruposVisiblesPara(rol).map((grupo) => [
    grupo.label,
    grupo.items.map((item) => item.label),
  ]);
}

describe('agrupación de la barra lateral', () => {
  it('jefe operativo ve Pendientes en Inicio y sus áreas de operación', () => {
    expect(resumen(Rol.JefeOperativo)).toEqual([
      ['Inicio', ['Pendientes']],
      ['Operación', ['Solicitudes', 'Viajes', 'Roster']],
      ['Gestión', ['Catálogos']],
    ]);
  });

  it('monitorista ve Dashboard en Inicio y no ve grupos vacíos', () => {
    expect(resumen(Rol.Monitorista)).toEqual([
      ['Inicio', ['Dashboard']],
      ['Operación', ['Viajes']],
      ['Gestión', ['Reportes']],
    ]);
  });

  it('administrador ve las dos pantallas de inicio juntas', () => {
    const grupos = resumen(Rol.Administrador);
    expect(grupos[0]).toEqual(['Inicio', ['Dashboard', 'Pendientes']]);
    expect(grupos[2]).toEqual(['Gestión', ['Catálogos', 'Reportes', 'Administración']]);
  });

  it('un rol sin entradas no ve ningún grupo', () => {
    expect(gruposVisiblesPara('rol_futuro' as Rol)).toEqual([]);
  });

  it('cada entrada pertenece a un grupo que existe', () => {
    const ids = new Set(['inicio', 'operacion', 'gestion']);
    for (const item of NAV_ITEMS) {
      expect(ids.has(item.grupo)).toBe(true);
    }
  });

  it('ningún rol interno ve una entrada repetida entre grupos', () => {
    for (const rol of ROLES_INTERNOS) {
      const etiquetas = gruposVisiblesPara(rol).flatMap((grupo) =>
        grupo.items.map((item) => item.id),
      );
      expect(new Set(etiquetas).size).toBe(etiquetas.length);
    }
  });
});
