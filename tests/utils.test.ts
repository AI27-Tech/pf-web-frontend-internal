// Pruebas de `cn`, el helper que une clases descartando falsy.
import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('une las clases con un espacio', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('descarta valores falsy (false, null, undefined, cadena vacía)', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('devuelve cadena vacía cuando no hay clases válidas', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});
