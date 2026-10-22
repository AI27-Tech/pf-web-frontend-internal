/*
 * Property tests de decisionSolicitud.ts (E8-T9, 3.2).
 *
 * Valida el guard de aprobación (Property 1 del design):
 * - `puedeAprobar(v)` es verdadero SII `v.estado === 'SOLICITADO'` y
 *   `fecha_hora_servicio` está presente (no nula ni vacía).
 * - El predicado es determinista.
 *
 * Usa fast-check para generar estados y fechas/horas de forma exhaustiva.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { puedeAprobar, tieneFechaHora } from '@/features/viajes/detalle/decisionSolicitud';
import { EstadoViaje } from '@/lib/contracts/viajeDetalle';
import type { ViajeInterno } from '@/lib/contracts/viajeDetalle';

const TODOS_LOS_ESTADOS = [
  EstadoViaje.Solicitado,
  EstadoViaje.Aprobado,
  EstadoViaje.Asignado,
  EstadoViaje.EnTransito,
  EstadoViaje.EnDestino,
  EstadoViaje.EnDescarga,
  EstadoViaje.Cerrado,
  EstadoViaje.RechazadoPorAi27,
  EstadoViaje.RechazadoPorCliente,
  EstadoViaje.Cancelado,
];

/** Construye un ViajeInterno mínimo para la prueba. */
function viaje(estado: string, fecha_hora_servicio: string | null | undefined): ViajeInterno {
  return {
    id: 'VJ-TEST',
    estado,
    origen: 'Origen de prueba',
    destinos: [{ nombre: 'D1', numero_envio: 'E1' }],
    fecha_hora_servicio,
    creado_en: new Date().toISOString(),
  } as ViajeInterno;
}

describe('puedeAprobar (Property Tests)', () => {
  it('Property 1: verdadero SII SOLICITADO con fecha/hora presente', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TODOS_LOS_ESTADOS),
        fc.oneof(
          fc.constant<string | null | undefined>(null),
          fc.constant<string | null | undefined>(undefined),
          fc.constant<string | null | undefined>(''),
          fc.constant<string | null | undefined>('   '),
          fc.constant<string | null | undefined>('2026-10-21T10:00:00.000Z'),
        ),
        (estado, fechaHora) => {
          const v = viaje(estado, fechaHora);
          const esperado =
            estado === EstadoViaje.Solicitado &&
            typeof fechaHora === 'string' &&
            fechaHora.trim().length > 0;
          expect(puedeAprobar(v)).toBe(esperado);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 2: bloquea aprobar en cualquier estado distinto de SOLICITADO, aun con fecha/hora', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TODOS_LOS_ESTADOS.filter((e) => e !== EstadoViaje.Solicitado)),
        (estado) => {
          expect(puedeAprobar(viaje(estado, '2026-10-21T10:00:00.000Z'))).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3: determinista', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TODOS_LOS_ESTADOS),
        fc.option(fc.constant('2026-10-21T10:00:00.000Z'), { nil: null }),
        (estado, fechaHora) => {
          const v = viaje(estado, fechaHora);
          expect(puedeAprobar(v)).toBe(puedeAprobar(v));
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('tieneFechaHora', () => {
  it('reconoce fecha/hora presente y ausente', () => {
    expect(tieneFechaHora(viaje(EstadoViaje.Solicitado, '2026-10-21T10:00:00.000Z'))).toBe(true);
    expect(tieneFechaHora(viaje(EstadoViaje.Solicitado, null))).toBe(false);
    expect(tieneFechaHora(viaje(EstadoViaje.Solicitado, undefined))).toBe(false);
    expect(tieneFechaHora(viaje(EstadoViaje.Solicitado, ''))).toBe(false);
    expect(tieneFechaHora(viaje(EstadoViaje.Solicitado, '   '))).toBe(false);
  });
});
