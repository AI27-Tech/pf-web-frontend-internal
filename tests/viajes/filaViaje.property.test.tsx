/*
 * Feature: e8-t7-bandeja-viajes, Property 3: Estado y condiciones separados (P15)
 *
 * Property 3 (Validates: Requirements 2.1, 2.2, 2.3, 2.4):
 * Para toda combinación de un `estado` y un conjunto de cero, una o dos condiciones
 * activas, el indicador de estado y los de condición ocupan elementos distintos:
 * un Badge por condición activa, ningún valor de condición en el slot de estado ni
 * viceversa, y ningún indicador de condición cuando el conjunto está vacío.
 *
 * También incluye la prueba de ejemplo de variantes de condición (tarea 5.3).
 *
 * Se renderizan las celdas de `columnasViaje` ('estado' y 'condiciones') de forma
 * aislada: cada `cell(row, index)` produce el JSX de su columna. Se verifica la
 * separación de slots por su `data-testid` distinto.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';

import { CondicionViaje } from '@/lib/contracts/viajes';
import type { CondicionViaje as CondicionViajeTipo } from '@/lib/contracts/viajes';
import { columnasViaje, VARIANTE_CONDICION } from '@/features/viajes/filaViaje';
import type { ViajeVista } from '@/features/viajes/viajeVista';

/** Valores posibles del enum, tomados del contrato (no definidos aquí). */
const CONDICIONES = Object.values(CondicionViaje) as CondicionViajeTipo[];

/** Celda de una columna por su key. Las columnas 'estado'/'condiciones' usan `cell`. */
function celda(key: string, fila: ViajeVista) {
  const col = columnasViaje.find((c) => c.key === key);
  if (!col?.cell) throw new Error(`columna ${key} sin cell`);
  return col.cell(fila, 0);
}

/** Genera un subconjunto (0, 1 o 2) de condiciones sin repetir. */
const arbCondiciones = (): fc.Arbitrary<readonly CondicionViajeTipo[]> =>
  fc.subarray(CONDICIONES, { minLength: 0, maxLength: CONDICIONES.length });

const arbEstado = (): fc.Arbitrary<string> => fc.stringMatching(/^[A-Z_]+$/);

describe('Feature: e8-t7-bandeja-viajes, Property 3: Estado y condiciones separados (P15)', () => {
  it('estado y condiciones ocupan slots distintos; un Badge por condición activa', () => {
    fc.assert(
      fc.property(arbEstado(), arbCondiciones(), (estado, condiciones) => {
        const fila: ViajeVista = {
          id: 'v1',
          estado,
          origen: 'CDMX',
          condiciones_activas: condiciones,
        };

        const { unmount } = render(
          <div>
            {celda('estado', fila)}
            {celda('condiciones', fila)}
          </div>,
        );

        const slotEstado = screen.getByTestId('estado');
        const slotCondiciones = screen.getByTestId('condiciones');

        // El slot de estado muestra exactamente el token de estado, nunca una condición.
        expect(slotEstado).toHaveTextContent(estado);
        for (const c of CONDICIONES) {
          // Si el estado generado no es el texto de la condición, la condición no
          // debe aparecer en el slot de estado.
          if (estado !== c) {
            expect(slotEstado).not.toHaveTextContent(c);
          }
        }

        // El slot de condiciones tiene un Badge (elemento hijo directo) por cada
        // condición activa, y ninguno cuando el conjunto está vacío.
        const badges = Array.from(slotCondiciones.children);
        expect(badges).toHaveLength(condiciones.length);
        for (const c of condiciones) {
          expect(slotCondiciones).toHaveTextContent(c);
        }
        if (condiciones.length === 0) {
          expect(slotCondiciones).toBeEmptyDOMElement();
        }

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});

describe('e8-t7-bandeja-viajes · variantes de condición (ejemplo, tarea 5.3)', () => {
  it('INCIDENCIA y SIN_SENAL provienen del enum y mapean a su variante de Badge', () => {
    // Procedencia: las claves del mapa son exactamente el enum del contrato.
    expect(Object.keys(VARIANTE_CONDICION).sort()).toEqual([...CONDICIONES].sort());

    expect(VARIANTE_CONDICION[CondicionViaje.Incidencia]).toBe('alert');
    expect(VARIANTE_CONDICION[CondicionViaje.SinSenal]).toBe('warning');

    const fila: ViajeVista = {
      id: 'v1',
      estado: 'EN_TRANSITO',
      origen: 'CDMX',
      condiciones_activas: [CondicionViaje.Incidencia, CondicionViaje.SinSenal],
    };
    render(<div>{celda('condiciones', fila)}</div>);
    const slot = screen.getByTestId('condiciones');
    expect(slot).toHaveTextContent('INCIDENCIA');
    expect(slot).toHaveTextContent('SIN_SENAL');
  });
});
