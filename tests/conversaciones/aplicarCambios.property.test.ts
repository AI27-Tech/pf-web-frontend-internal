/*
 * Propiedades de la mezcla de cambios de la bandeja (E8-T15, tarea 12).
 *
 * Propiedades 3 y 4 del diseño: mezcla idempotente, mensajes ordenados por
 * `secuencia` sin duplicados y cobertura sin huecos de bootstrap + catch-ups.
 * El reemplazo del estado previo ante `stream_resync_required` lo hace el hook
 * (`setItems(data.items)`) y se verifica en la prueba de integración del
 * Escenario 6; aquí se verifica su contraparte pura: cargar sobre un estado vacío
 * no conserva nada del estado anterior.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { aplicarConversaciones, aplicarMensajes } from '@/features/conversaciones/aplicarCambios';
import type { Conversacion, Mensaje } from '@/lib/contracts/conversaciones';

const mensaje = (secuencia: number, cuerpo = String(secuencia)): Mensaje =>
  ({
    id: `m${secuencia}`,
    conversacion_id: 'CNV-x',
    secuencia,
    client_message_id: `cm${secuencia}`,
    audiencia_autor: 'Interno',
    alias_mostrado: 'AI27 Operations',
    cuerpo,
    creado_en: '2026-01-01T00:00:00Z',
  }) as Mensaje;

const conversacion = (id: string, version: number): Conversacion =>
  ({
    id,
    viaje_id: 'VJ-x',
    cliente_id: 'CLI-x',
    estado: 'abierta',
    ultima_secuencia: 1,
    version_reclamo: version,
    abierta_en: '2026-01-01T00:00:00Z',
  }) as Conversacion;

/** Lote de mensajes con secuencias arbitrarias (con repetidos y en cualquier orden). */
const arbMensajes = fc
  .array(fc.integer({ min: 1, max: 40 }), { maxLength: 30 })
  .map((secuencias) => secuencias.map((s) => mensaje(s)));

const arbConversaciones = fc
  .array(fc.tuple(fc.constantFrom('a', 'b', 'c', 'd', 'e'), fc.integer({ min: 0, max: 50 })), {
    maxLength: 20,
  })
  .map((pares) => pares.map(([id, version]) => conversacion(id, version)));

const secuencias = (lista: readonly Mensaje[]) => lista.map((m) => m.secuencia);

describe('aplicarCambios — Property tests', () => {
  describe('Property 3: mezcla idempotente', () => {
    it('aplicar dos veces el mismo lote de mensajes equivale a aplicarlo una vez', () => {
      fc.assert(
        fc.property(arbMensajes, arbMensajes, (actuales, nuevos) => {
          const una = aplicarMensajes(actuales, nuevos);
          expect(aplicarMensajes(una, nuevos)).toEqual(una);
        }),
      );
    });

    it('los mensajes quedan en orden estrictamente ascendente por secuencia, sin repetidos', () => {
      fc.assert(
        fc.property(arbMensajes, arbMensajes, (actuales, nuevos) => {
          const resultado = secuencias(aplicarMensajes(actuales, nuevos));
          for (let i = 1; i < resultado.length; i += 1) {
            expect(resultado[i]!).toBeGreaterThan(resultado[i - 1]!);
          }
          expect(new Set(resultado)).toEqual(
            new Set([...secuencias(actuales), ...secuencias(nuevos)]),
          );
        }),
      );
    });

    it('no ordena por creado_en: una secuencia menor con fecha posterior sigue primero', () => {
      const tardio = { ...mensaje(1), creado_en: '2030-01-01T00:00:00Z' } as Mensaje;
      const temprano = { ...mensaje(2), creado_en: '2020-01-01T00:00:00Z' } as Mensaje;
      expect(secuencias(aplicarMensajes([temprano], [tardio]))).toEqual([1, 2]);
    });

    it('aplicar dos veces el mismo lote de conversaciones equivale a aplicarlo una vez, sin ids repetidos', () => {
      fc.assert(
        fc.property(arbConversaciones, arbConversaciones, (actuales, cambios) => {
          const una = aplicarConversaciones(actuales, cambios);
          expect(aplicarConversaciones(una, cambios)).toEqual(una);
          const ids = una.map((c) => c.id);
          expect(new Set(ids).size).toBe(ids.length);
        }),
      );
    });

    it('para cada id prevalece el último cambio y las conversaciones sin cambio se conservan', () => {
      fc.assert(
        fc.property(arbConversaciones, arbConversaciones, (actuales, cambios) => {
          const resultado = new Map(aplicarConversaciones(actuales, cambios).map((c) => [c.id, c]));
          const ultimoCambio = new Map(cambios.map((c) => [c.id, c]));
          const ultimoActual = new Map(actuales.map((c) => [c.id, c]));
          for (const [id, esperada] of ultimoCambio) expect(resultado.get(id)).toEqual(esperada);
          for (const [id, esperada] of ultimoActual) {
            if (!ultimoCambio.has(id)) expect(resultado.get(id)).toEqual(esperada);
          }
          expect(resultado.size).toBe(
            new Set([...ultimoCambio.keys(), ...ultimoActual.keys()]).size,
          );
        }),
      );
    });
  });

  describe('Property 4: cobertura sin huecos ni duplicados', () => {
    /** Reparte 1..total en un bootstrap y catch-ups sucesivos, con solapes y desorden. */
    const arbReparto = fc.integer({ min: 1, max: 40 }).chain((total) =>
      fc.record({
        total: fc.constant(total),
        cortes: fc.uniqueArray(fc.integer({ min: 1, max: total }), { maxLength: 8 }),
        solape: fc.integer({ min: 0, max: 5 }),
        semilla: fc.integer(),
      }),
    );

    it('bootstrap más catch-ups reflejan cada mensaje exactamente una vez', () => {
      fc.assert(
        fc.property(arbReparto, ({ total, cortes, solape, semilla }) => {
          const limites = [...[...cortes].sort((a, b) => a - b), total];
          let desde = 1;
          let estado: Mensaje[] = [];
          limites.forEach((hasta, indice) => {
            // Cada catch-up repite hasta `solape` mensajes ya vistos y llega desordenado.
            const inicio = indice === 0 ? desde : Math.max(1, desde - solape);
            const lote = Array.from({ length: Math.max(0, hasta - inicio + 1) }, (_, i) =>
              mensaje(inicio + i),
            );
            if ((semilla + indice) % 2 === 0) lote.reverse();
            estado = aplicarMensajes(estado, lote);
            desde = Math.max(desde, hasta + 1);
          });
          expect(secuencias(estado)).toEqual(Array.from({ length: total }, (_, i) => i + 1));
        }),
      );
    });

    it('un nuevo bootstrap sobre un estado vacío reemplaza lo anterior (resync)', () => {
      fc.assert(
        fc.property(arbConversaciones, arbConversaciones, (previas, bootstrap) => {
          // Un resync parte de cero: el resultado no depende del estado previo.
          const reemplazado = aplicarConversaciones([], bootstrap);
          const idsBootstrap = new Set(bootstrap.map((c) => c.id));
          expect(reemplazado.map((c) => c.id).sort()).toEqual([...idsBootstrap].sort());
          // Mezclar sobre el estado previo, en cambio, conservaría lo que el bootstrap no trae.
          const mezclado = new Set(aplicarConversaciones(previas, bootstrap).map((c) => c.id));
          for (const previa of previas) expect(mezclado.has(previa.id)).toBe(true);
        }),
      );
    });
  });
});
