/*
 * Entrada «Dashboard» de la navegación (E8-T17). Se muestra solo a los roles de
 * `puedeUsarMonitoreo` y apunta a `/monitoreo/dashboard`.
 */
import { describe, expect, it } from 'vitest';
import { Rol } from '@ai27-tech/contracts/roles';

import { puedeUsarMonitoreo } from '@/features/monitoreo/puedeUsarMonitoreo';
import { entradasVisiblesPara } from '@/components/layout/navigationConfig';

const TODOS_LOS_ROLES: readonly Rol[] = [
  Rol.Cliente,
  Rol.JefeOperativo,
  Rol.Monitorista,
  Rol.Supervisor,
  Rol.Coordinador,
  Rol.Ejecutivo,
  Rol.Reaccion,
  Rol.Administrador,
];

function entradaDashboard(rol: Rol) {
  return entradasVisiblesPara(rol).find((item) => item.id === 'dashboard');
}

describe('E8-T17 · entrada Dashboard en la navegación', () => {
  it.each(TODOS_LOS_ROLES)('el rol %s ve la entrada solo si puede usar monitoreo', (rol) => {
    expect(entradaDashboard(rol) !== undefined).toBe(puedeUsarMonitoreo(rol));
  });

  it('la entrada apunta al dashboard de monitoreo', () => {
    expect(entradaDashboard(Rol.Monitorista)?.path).toBe('/monitoreo/dashboard');
    expect(entradaDashboard(Rol.Monitorista)?.label).toBe('Dashboard');
  });
});
