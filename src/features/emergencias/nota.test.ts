import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { esNotaValida, LONGITUD_MAXIMA_NOTA, normalizarNota } from './nota';

describe('validación de nota (P4)', () => {
  it('toda cadena de solo espacios es inválida', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(' ', '\t', '\n')).map((c) => c.join('')),
        (texto) => {
          expect(esNotaValida(texto)).toBe(false);
        },
      ),
    );
  });

  it('la nota enviada tiene de 1 a 1.000 caracteres tras recortar, si es válida', () => {
    fc.assert(
      fc.property(fc.string(), (texto) => {
        if (esNotaValida(texto)) {
          const enviada = normalizarNota(texto);
          expect(enviada.length).toBeGreaterThanOrEqual(1);
          expect(enviada.length).toBeLessThanOrEqual(LONGITUD_MAXIMA_NOTA);
        }
      }),
    );
  });

  it('acepta el límite exacto y rechaza un carácter más', () => {
    expect(esNotaValida('a'.repeat(LONGITUD_MAXIMA_NOTA))).toBe(true);
    expect(esNotaValida('a'.repeat(LONGITUD_MAXIMA_NOTA + 1))).toBe(false);
  });
});
