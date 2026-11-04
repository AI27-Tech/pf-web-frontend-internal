/*
 * E8-T17, tarea 30: la entrada «Reportes» del AppShell no aparece para reaccion,
 * jefe_operativo ni ejecutivo. Sí aparece para monitorista, supervisor, coordinador
 * y administrador. La negación real la aplica el bff; esta prueba cubre la afordancia.
 */
import { describe, expect, it } from 'vitest';
import { Rol } from '@ai27-tech/contracts/roles';

import { entradasVisiblesPara } from '@/components/layout/navigationConfig';

function veReportes(rol: Rol): boolean {
  return entradasVisiblesPara(rol).some((item) => item.id === 'reportes');
}

describe('E8-T17 · entrada Reportes por rol', () => {
  it.each([Rol.Reaccion, Rol.JefeOperativo, Rol.Ejecutivo])('%s no ve Reportes', (rol) => {
    expect(veReportes(rol)).toBe(false);
  });

  it.each([Rol.Monitorista, Rol.Supervisor, Rol.Coordinador, Rol.Administrador])(
    '%s sí ve Reportes',
    (rol) => {
      expect(veReportes(rol)).toBe(true);
    },
  );
});
