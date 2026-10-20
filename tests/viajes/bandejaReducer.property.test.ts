import { describe, it } from 'vitest';
import fc from 'fast-check';
import { reducir, paramsDesdeVista, type EstadoVista } from '@/features/viajes/bandejaReducer';

/**
 * Generadores arbitrarios para property-based testing del reducer.
 *
 * El estado de vista es `{ estado?, pagina, cursores }`: `pagina` es base 1 y
 * `cursores[i]` es el cursor que pide la página (i + 2). Un estado coherente tiene
 * `cursores.length === pagina - 1` (una entrada de cursor por cada avance desde la
 * primera página). Los generadores respetan esa invariante.
 */

/** Genera un estado de vista coherente: cursores.length === pagina - 1. */
const arbEstadoVista = (): fc.Arbitrary<EstadoVista> =>
  fc
    .tuple(
      fc.option(fc.stringMatching(/^[A-Z_]*$/), { nil: undefined }),
      fc.integer({ min: 1, max: 6 }),
    )
    .chain(([estado, pagina]) =>
      fc.array(fc.uuid(), { minLength: pagina - 1, maxLength: pagina - 1 }).map((cursores) => ({
        ...(estado !== undefined ? { estado } : {}),
        pagina,
        cursores,
      })),
    );

describe('bandejaReducer — Property tests', () => {
  describe('Property 4: Mapeo de selección a query params con reinicio de cursor', () => {
    it('paramsDesdeVista incluye estado si y solo si está presente, y cursor = tope de la pila', () => {
      fc.assert(
        fc.property(arbEstadoVista(), (estado) => {
          const params = paramsDesdeVista(estado);

          // estado se mapea si y solo si está presente.
          if (estado.estado !== undefined) {
            if (params.estado !== estado.estado) {
              throw new Error(`estado esperado ${estado.estado}, got ${params.estado}`);
            }
          } else if (params.estado !== undefined) {
            throw new Error(`estado debe ser undefined, got ${params.estado}`);
          }

          // cursor = último de la pila; en página 1 (pila vacía) no hay cursor.
          const esperado = estado.cursores[estado.cursores.length - 1];
          if (params.cursor !== esperado) {
            throw new Error(`cursor esperado ${esperado}, got ${params.cursor}`);
          }

          // No hay claves extra.
          const keys = Object.keys(params).filter(
            (k) => params[k as keyof typeof params] !== undefined,
          );
          const expectedKeys = [
            ...(estado.estado !== undefined ? ['estado'] : []),
            ...(esperado !== undefined ? ['cursor'] : []),
          ];
          if (keys.sort().join(',') !== expectedKeys.sort().join(',')) {
            throw new Error(`claves inesperadas: ${keys.join(',')} vs ${expectedKeys.join(',')}`);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('cambiarFiltro reinicia la paginación (página 1, sin cursores)', () => {
      fc.assert(
        fc.property(arbEstadoVista(), fc.stringMatching(/^[A-Z_]*$/), (previo, nuevoEstado) => {
          const siguiente = reducir(previo, { tipo: 'cambiarFiltro', nuevoEstado });

          if (siguiente.estado !== nuevoEstado) {
            throw new Error(`filtro no aplicado: ${siguiente.estado}`);
          }
          if (siguiente.pagina !== 1) {
            throw new Error(`cambiarFiltro debe reiniciar a página 1, got ${siguiente.pagina}`);
          }
          if (siguiente.cursores.length !== 0) {
            throw new Error(`cambiarFiltro debe vaciar cursores, got ${siguiente.cursores.length}`);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('irAPagina avanza apilando el cursor_siguiente y conserva el filtro', () => {
      fc.assert(
        fc.property(arbEstadoVista(), fc.uuid(), (previo, cursorSiguiente) => {
          const siguiente = reducir(previo, {
            tipo: 'irAPagina',
            pagina: previo.pagina + 1,
            cursorSiguiente,
          });

          // Avanzar: página +1, pila con el cursor nuevo al tope, filtro intacto.
          if (siguiente.pagina !== previo.pagina + 1) {
            throw new Error(`página esperada ${previo.pagina + 1}, got ${siguiente.pagina}`);
          }
          if (siguiente.cursores[siguiente.cursores.length - 1] !== cursorSiguiente) {
            throw new Error('el cursor nuevo no quedó al tope de la pila');
          }
          if (siguiente.cursores.length !== previo.cursores.length + 1) {
            throw new Error('la pila de cursores no creció en 1 al avanzar');
          }
          if (siguiente.estado !== previo.estado) {
            throw new Error(`filtro no conservado: ${siguiente.estado} vs ${previo.estado}`);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('irAPagina retrocede recortando la pila al tamaño de la página destino', () => {
      fc.assert(
        fc.property(
          arbEstadoVista().filter((e) => e.pagina >= 2),
          (previo) => {
            const destino = previo.pagina - 1;
            const siguiente = reducir(previo, {
              tipo: 'irAPagina',
              pagina: destino,
              cursorSiguiente: null,
            });

            if (siguiente.pagina !== destino) {
              throw new Error(`página esperada ${destino}, got ${siguiente.pagina}`);
            }
            // Coherencia: cursores.length === pagina - 1.
            if (siguiente.cursores.length !== destino - 1) {
              throw new Error(`pila incoherente: ${siguiente.cursores.length} vs ${destino - 1}`);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
