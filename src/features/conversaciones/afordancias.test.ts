import { describe, expect, it } from 'vitest';
import { capacidades } from './afordancias';
import type { Conversacion } from '@/lib/contracts/conversaciones';

const base = {
  id: 'c',
  viaje_id: 'v',
  cliente_id: 'cl',
  estado: 'abierta',
  ultima_secuencia: 1,
  version_reclamo: 2,
  abierta_en: '2026-01-01T00:00:00Z',
} as Conversacion;

describe('capacidades de conversación', () => {
  it('permite reclamar en pool y no responder', () => {
    const c = capacidades(base, 'yo');
    expect(c.puedeReclamar).toBe(true);
    expect(c.puedeResponder).toBe(false);
    expect(c.razonCompositor).toBe('en_pool');
  });
  it('solo habilita acciones al responsable', () => {
    const propia = {
      ...base,
      reclamo_activo: {
        id: 'r',
        conversacion_id: 'c',
        responsable_id: 'yo',
        version: 2,
        abierto_en: base.abierta_en,
      },
    };
    const otra = { ...base, reclamo_activo: { ...propia.reclamo_activo, responsable_id: 'otro' } };
    expect(capacidades(propia, 'yo').puedeResponder).toBe(true);
    expect(capacidades(otra, 'yo').puedeResponder).toBe(false);
  });
  it('prioriza solo lectura', () => {
    expect(capacidades({ ...base, estado: 'cerrada' }, 'yo').razonCompositor).toBe('solo_lectura');
  });
});
