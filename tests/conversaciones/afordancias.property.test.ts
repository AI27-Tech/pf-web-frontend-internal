/*
 * Propiedades de las afordancias de la bandeja (E8-T15, tarea 12).
 *
 * Propiedad 1 del diseño (habilitación del compositor) y Propiedad 8 (sin gestos
 * de mando sobre una conversación ajena, para ningún rol). `capacidades` solo
 * recibe la conversación y el sujeto de la sesión: el rol no entra en la decisión
 * (DEC-107, DEC-118), así que un Supervisor, Coordinador o Administrador recibe
 * exactamente lo que recibe un Ejecutivo.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { capacidades } from '@/features/conversaciones/afordancias';
import type { Conversacion } from '@/lib/contracts/conversaciones';

const ESTADOS = ['abierta', 'solo_lectura', 'cerrada'] as const;

/** Conversación arbitraria; el reclamo activo es el sujeto, otra persona o ninguno. */
const arbEscenario = fc
  .record({
    estado: fc.constantFrom(...ESTADOS),
    quien: fc.constantFrom('ninguno', 'sujeto', 'otro'),
    sujetoId: fc.uuid(),
    otroId: fc.uuid(),
    version: fc.integer({ min: 0, max: 1_000 }),
    atendida: fc.boolean(),
  })
  .filter(({ sujetoId, otroId }) => sujetoId !== otroId)
  .map(({ estado, quien, sujetoId, otroId, version, atendida }) => {
    const responsable = quien === 'sujeto' ? sujetoId : quien === 'otro' ? otroId : undefined;
    const conversacion = {
      id: 'CNV-x',
      viaje_id: 'VJ-x',
      cliente_id: 'CLI-x',
      estado,
      ultima_secuencia: 1,
      version_reclamo: version,
      abierta_en: '2026-01-01T00:00:00Z',
      atendida_en: atendida ? '2026-01-02T00:00:00Z' : null,
      reclamo_activo: responsable
        ? {
            id: 'RCL-x',
            conversacion_id: 'CNV-x',
            responsable_id: responsable,
            version,
            abierto_en: '2026-01-01T00:00:00Z',
          }
        : null,
    } as Conversacion;
    return { conversacion, sujetoId, quien, estado };
  });

describe('afordancias — Property tests', () => {
  it('Property 1: el compositor se habilita si y solo si la conversación admite escritura y el usuario es el responsable', () => {
    fc.assert(
      fc.property(arbEscenario, ({ conversacion, sujetoId, quien, estado }) => {
        const c = capacidades(conversacion, sujetoId);
        const esperado = estado === 'abierta' && quien === 'sujeto';
        expect(c.puedeResponder).toBe(esperado);
        // La razón de deshabilitado existe exactamente cuando no se puede responder.
        expect(c.razonCompositor === null).toBe(esperado);
      }),
    );
  });

  it('Property 1: solo lectura y cerrada prevalecen sobre el reclamo, aun siendo el responsable', () => {
    fc.assert(
      fc.property(arbEscenario, ({ conversacion, sujetoId, estado }) => {
        fc.pre(estado !== 'abierta');
        const c = capacidades(conversacion, sujetoId);
        expect(c).toEqual({
          puedeReclamar: false,
          puedeResponder: false,
          puedeDevolverAlPool: false,
          puedeMarcarAtendida: false,
          razonCompositor: 'solo_lectura',
        });
      }),
    );
  });

  it('Property 8: sobre una conversación ajena nadie recibe gestos de mando, sea cual sea su rol', () => {
    // El rol no es una entrada de `capacidades`: si alguien la ampliara, esta aridad avisa.
    expect(capacidades.length).toBe(2);
    fc.assert(
      fc.property(arbEscenario, ({ conversacion, sujetoId, quien }) => {
        fc.pre(quien === 'otro');
        const c = capacidades(conversacion, sujetoId);
        expect(c.puedeResponder).toBe(false);
        expect(c.puedeDevolverAlPool).toBe(false);
        expect(c.puedeMarcarAtendida).toBe(false);
        expect(c.puedeReclamar).toBe(false);
        expect(c.razonCompositor).toBe(
          conversacion.estado === 'abierta' ? 'reclamada_por_otro' : 'solo_lectura',
        );
      }),
    );
  });

  it('Property 8: reclamar solo se ofrece en una conversación abierta del pool, y nunca junto con los gestos del responsable', () => {
    fc.assert(
      fc.property(arbEscenario, ({ conversacion, sujetoId, quien, estado }) => {
        const c = capacidades(conversacion, sujetoId);
        expect(c.puedeReclamar).toBe(estado === 'abierta' && quien === 'ninguno');
        if (c.puedeReclamar) {
          expect(c.puedeResponder || c.puedeDevolverAlPool || c.puedeMarcarAtendida).toBe(false);
        }
      }),
    );
  });
});
