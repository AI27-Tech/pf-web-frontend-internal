/*
 * M9 · Afordancias de emergencias por rol y estado del caso (spec
 * `afinacion-roles-modulo-a-modulo`, Requirement 10, escenarios E13 y E16).
 *
 * La política decide por rol; la regla del estado del caso y del responsable vigente sigue en
 * `afordancias.ts`. Cada fila cruza los ocho roles internos con tres casos.
 */
import { describe, expect, it } from 'vitest';
import type { Rol } from '@ai27-tech/contracts/roles';
import {
  puedeActivar,
  puedeAnotar,
  puedeCerrar,
  puedeDevolver,
  puedeReclamar,
  puedeResolver,
  type CasoParaAfordancias,
} from '@/features/emergencias/afordancias';
import type { Reclamo } from '@/lib/contracts/emergencias';
import { puede } from '@/lib/permisos';
import { ROLES_INTERNOS } from '@/lib/permisos/roles';

const YO = 'sujeto-yo';
const OTRO = 'sujeto-otro';

/** Reclamo vigente de 
esponsable con los campos que exige el contrato. */
function reclamo(responsable: string): Reclamo {
  return {
    id: 'rec-1',
    conversacion_id: 'conv-1',
    responsable_id: responsable,
    version: 1,
    abierto_en: '2026-11-04T09:00:00Z',
  };
}

const ABIERTA: CasoParaAfordancias = { estado: 'abierta', reclamo_activo: null };
const AJENO: CasoParaAfordancias = {
  estado: 'en_atencion',
  reclamo_activo: reclamo(OTRO),
};
const PROPIO: CasoParaAfordancias = {
  estado: 'en_atencion',
  reclamo_activo: reclamo(YO),
};
const RESUELTA: CasoParaAfordancias = { estado: 'resuelta', reclamo_activo: null };

const ROLES = ROLES_INTERNOS as readonly Rol[];
const conRol = (lista: readonly string[]) => ROLES.filter((rol) => lista.includes(rol));

describe('E16: supervisor y coordinador devuelven y transfieren; no reclaman ni resuelven', () => {
  it.each(['supervisor', 'coordinador'] as const)('%s sobre un caso ajeno', (rol) => {
    expect(puedeDevolver(rol, AJENO, YO)).toBe(true);
    expect(puedeReclamar(rol, ABIERTA)).toBe(false);
    expect(puedeResolver(rol, PROPIO, YO)).toBe(false);
  });
});

describe('quién ejerce cada gesto sobre un caso', () => {
  it('reclamar: solo Reacción, y solo un caso abierto sin responsable', () => {
    for (const rol of ROLES) {
      expect(puedeReclamar(rol, ABIERTA), rol).toBe(rol === 'reaccion');
      expect(puedeReclamar(rol, AJENO), rol).toBe(false);
    }
  });

  it('resolver: solo Reacción y solo si es el responsable', () => {
    for (const rol of ROLES) {
      expect(puedeResolver(rol, PROPIO, YO), rol).toBe(rol === 'reaccion');
      expect(puedeResolver(rol, AJENO, YO), rol).toBe(false);
    }
  });

  it('devolver un caso propio: Reacción, supervisor y coordinador', () => {
    expect(conRol(ROLES.filter((rol) => puedeDevolver(rol, PROPIO, YO)))).toEqual(
      conRol(['reaccion', 'supervisor', 'coordinador']),
    );
  });

  it('devolver un caso ajeno: solo supervisor y coordinador', () => {
    expect(ROLES.filter((rol) => puedeDevolver(rol, AJENO, YO))).toEqual(
      conRol(['supervisor', 'coordinador']),
    );
  });

  it('anotar y cerrar: monitoreo y administrador; Reacción nunca', () => {
    const esperado = conRol(['monitorista', 'supervisor', 'coordinador', 'administrador']);
    expect(ROLES.filter((rol) => puedeAnotar(rol, AJENO))).toEqual(esperado);
    expect(ROLES.filter((rol) => puedeCerrar(rol, RESUELTA))).toEqual(esperado);
    expect(puedeCerrar('reaccion', RESUELTA)).toBe(false);
    expect(puedeAnotar('reaccion', ABIERTA)).toBe(false);
  });

  it('cerrar solo ofrece casos resueltos', () => {
    for (const rol of ROLES) {
      expect(puedeCerrar(rol, ABIERTA)).toBe(false);
      expect(puedeCerrar(rol, AJENO)).toBe(false);
    }
  });
});

describe('E13 y carril del viaje', () => {
  it('administrador ve el botón de activar, como monitoreo (decisión del Lead 5)', () => {
    expect(puedeActivar('administrador', 'EN_TRANSITO')).toBe(true);
    expect(ROLES.filter((rol) => puedeActivar(rol, 'EN_TRANSITO'))).toEqual(
      conRol(['monitorista', 'supervisor', 'coordinador', 'administrador']),
    );
  });

  it('el carril del viaje y la bandeja son superficies distintas', () => {
    expect(ROLES.filter((rol) => puede(rol, 'emergencia.verDeViaje'))).toEqual(
      conRol(['monitorista', 'supervisor', 'coordinador', 'administrador']),
    );
    expect(ROLES.filter((rol) => puede(rol, 'emergencia.bandeja'))).toEqual(
      conRol(['reaccion', 'supervisor', 'coordinador']),
    );
  });
});
