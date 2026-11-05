/*
 * E8-T4 — Definición de terminado: "la página de inicio corresponde al rol".
 *
 * Verifica el mapeo rol → ruta inicial que la guarda usa para aterrizar a cada
 * usuario donde la tarea manda:
 *   jefe_operativo → su panel; monitorista → dashboard de monitoreo;
 *   ejecutivo → conversaciones; reaccion → emergencias.
 */

import { describe, expect, it } from 'vitest';
import { Rol } from '@ai27-tech/contracts/roles';

import { getInitialRouteForRole } from '@/lib/hooks/useInitialRoute';

describe('E8-T4 · inicio por rol', () => {
  it('jefe_operativo aterriza en su panel (E8-T20)', () => {
    expect(getInitialRouteForRole(Rol.JefeOperativo)).toBe('/jefe-operativo/panel');
  });

  it('monitorista, supervisor y coordinador van al dashboard de monitoreo (E8-T17)', () => {
    expect(getInitialRouteForRole(Rol.Monitorista)).toBe('/monitoreo/dashboard');
    expect(getInitialRouteForRole(Rol.Supervisor)).toBe('/monitoreo/dashboard');
    expect(getInitialRouteForRole(Rol.Coordinador)).toBe('/monitoreo/dashboard');
  });

  it('ejecutivo aterriza en la bandeja de conversaciones (E8-T15)', () => {
    expect(getInitialRouteForRole(Rol.Ejecutivo)).toBe('/conversaciones');
  });

  it('reaccion aterriza en la bandeja de emergencias (E7-T1)', () => {
    expect(getInitialRouteForRole(Rol.Reaccion)).toBe('/emergencias');
  });
});
