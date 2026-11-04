/**
 * Afordancia de monitoreo por rol (E8-T17, tarea 10). Tabla explícita de los
 * ocho roles V1: verdadera para monitorista, supervisor, coordinador y administrador.
 */
import { describe, expect, it } from 'vitest';

import type { Rol } from '@ai27-tech/contracts/roles';

import { puedeUsarMonitoreo } from '@/features/monitoreo/puedeUsarMonitoreo';

const TABLA: readonly (readonly [Rol, boolean])[] = [
  ['cliente', false],
  ['jefe_operativo', false],
  ['monitorista', true],
  ['supervisor', true],
  ['coordinador', true],
  ['ejecutivo', false],
  ['reaccion', false],
  ['administrador', true],
];

describe('puedeUsarMonitoreo', () => {
  it.each(TABLA)('rol %s → %s', (rol, esperado) => {
    expect(puedeUsarMonitoreo(rol)).toBe(esperado);
  });
});
