/*
 * Property tests de accionesTransicion.ts (E8-T8, 3.2).
 *
 * Valida invariantes:
 * - Property 1: Acciones = aristas de TRANSICIONES_VIAJE menos PATRULLA_EN_CAMINO
 * - Property 2: Estados terminales devuelven lista vacía
 *
 * Usa fc (fast-check) para generar estados de forma exhaustiva.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { accionesDesde } from '@/features/viajes/detalle/accionesTransicion';
import { EstadoViaje, TRANSICIONES_VIAJE, esTerminal } from '@/lib/contracts/viajeDetalle';

// Generar todos los estados conocidos como un conjunto exhaustivo
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

describe('accionesDesde (Property Tests)', () => {
  it('Property 1: Acciones son aristas válidas menos PATRULLA_EN_CAMINO', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TODOS_LOS_ESTADOS), (estado) => {
        const acciones = accionesDesde(estado);

        // Todas las acciones deben ser destinos válidos desde el estado actual
        for (const accion of acciones) {
          const esArista = TRANSICIONES_VIAJE.some(
            ([desde, hacia]) => desde === estado && hacia === accion,
          );
          expect(esArista).toBe(true);
        }

        // PATRULLA_EN_CAMINO nunca debe aparecer como acción (inalcanzable en V1)
        expect(acciones.includes(EstadoViaje.PatrullaEnCamino)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 2: Estados terminales sin acciones', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          EstadoViaje.RechazadoPorAi27,
          EstadoViaje.RechazadoPorCliente,
          EstadoViaje.Cerrado,
          EstadoViaje.Cancelado,
        ),
        (estado) => {
          const acciones = accionesDesde(estado);
          expect(acciones.length).toBe(0);
          expect(esTerminal(estado)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3: No-terminal siempre tiene al menos una acción (o es un estado válido)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          EstadoViaje.Solicitado,
          EstadoViaje.Aprobado,
          EstadoViaje.Asignado,
          EstadoViaje.EnTransito,
          EstadoViaje.EnDestino,
          EstadoViaje.EnDescarga,
        ),
        (estado) => {
          const acciones = accionesDesde(estado);
          expect(esTerminal(estado)).toBe(false);
          // Cada estado no-terminal debe tener al menos una acción
          expect(acciones.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 4: Accionesdesde es determinista', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TODOS_LOS_ESTADOS), (estado) => {
        const accion1 = accionesDesde(estado);
        const accion2 = accionesDesde(estado);

        // El conjunto de acciones debe ser idéntico en ambas llamadas
        expect(accion1.sort()).toEqual(accion2.sort());
      }),
      { numRuns: 100 },
    );
  });

  it('Property 5: No hay acciones duplicadas en el resultado', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TODOS_LOS_ESTADOS), (estado) => {
        const acciones = accionesDesde(estado);
        const conjuntoUnico = new Set(acciones);
        expect(acciones.length).toBe(conjuntoUnico.size);
      }),
      { numRuns: 100 },
    );
  });
});
