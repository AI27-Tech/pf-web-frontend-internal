import { describe, it } from 'vitest';
import fc from 'fast-check';
import { adaptarItem, adaptarPagina } from '@/features/viajes/viajeVista';
import type { ViajeResumen, PaginaViajesResumen } from '@/lib/contracts/viajes';

/**
 * Generadores arbitrarios para property-based testing.
 */

/** Genera un ViajeResumen arbitrario. */
const arbViajeResumen = (): fc.Arbitrary<ViajeResumen> =>
  fc.record({
    id: fc.uuid(),
    estado: fc.stringMatching(/^[A-Z_]+$/), // tokens literales como EN_RUTA, EN_DESTINO, etc.
    origen: fc.string({ minLength: 1, maxLength: 100 }),
  });

/** Genera una PaginaViajesResumen arbitraria. */
const arbPaginaViajesResumen = (): fc.Arbitrary<PaginaViajesResumen> =>
  fc.record({
    items: fc.array(arbViajeResumen(), { minLength: 0, maxLength: 10 }),
    cursor_siguiente: fc.option(fc.uuid(), { nil: null }),
  });

describe('viajeVista — Property tests', () => {
  describe('Property 1: Render fiel — orden y conjunto idénticos a lo que entrega el bff', () => {
    it('adaptarPagina produce una fila por ítem, en mismo orden, con mismo id/estado/origen', () => {
      fc.assert(
        fc.property(arbPaginaViajesResumen(), (pagina) => {
          const vista = adaptarPagina(pagina);

          // Cantidad de filas = cantidad de items
          if (vista.filas.length !== pagina.items.length) {
            throw new Error(`Expected ${pagina.items.length} filas, got ${vista.filas.length}`);
          }

          // Cada fila coincide con su item en id, estado, origen y orden
          pagina.items.forEach((item, i) => {
            const fila = vista.filas[i];
            if (!fila) {
              throw new Error(`Fila ${i} no existe`);
            }

            if (fila.id !== item.id) {
              throw new Error(`Fila ${i}: id mismatch. Expected ${item.id}, got ${fila.id}`);
            }
            if (fila.estado !== item.estado) {
              throw new Error(
                `Fila ${i}: estado mismatch. Expected ${item.estado}, got ${fila.estado}`,
              );
            }
            if (fila.origen !== item.origen) {
              throw new Error(
                `Fila ${i}: origen mismatch. Expected ${item.origen}, got ${fila.origen}`,
              );
            }
          });

          // cursor_siguiente se propaga correctamente
          const expectedCursor = pagina.cursor_siguiente ?? null;
          if (vista.cursorSiguiente !== expectedCursor) {
            throw new Error(
              `Cursor mismatch. Expected ${expectedCursor}, got ${vista.cursorSiguiente}`,
            );
          }
        }),
      );
    });
  });

  describe('Property 2: Estado mostrado literal (procedencia del bff)', () => {
    it('adaptarItem conserva el estado tal cual sin derivar ni sustituir', () => {
      fc.assert(
        fc.property(arbViajeResumen(), (viaje) => {
          const vista = adaptarItem(viaje);

          // El estado en vista es exactamente el del wire
          if (vista.estado !== viaje.estado) {
            throw new Error(`Estado no conservado. Wire: ${viaje.estado}, Vista: ${vista.estado}`);
          }

          // El estado no se normaliza ni se cambia
          // (verificamos que es el mismo valor literal)
          if (typeof vista.estado !== 'string') {
            throw new Error(`Estado no es string: ${typeof vista.estado}`);
          }
        }),
      );
    });
  });
});
