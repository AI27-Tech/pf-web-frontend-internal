import { describe, it, expect } from 'vitest';
import { construirQueryString } from '@/lib/api/viajes';

describe('viajesApi — construirQueryString', () => {
  it('sin parámetros devuelve cadena vacía', () => {
    expect(construirQueryString({})).toBe('');
  });

  it('solo estado', () => {
    const qs = construirQueryString({ estado: 'EN_RUTA' });
    expect(qs).toContain('estado=EN_RUTA');
  });

  it('solo cursor', () => {
    const qs = construirQueryString({ cursor: 'abc123' });
    expect(qs).toContain('cursor=abc123');
  });

  it('ambos parámetros', () => {
    const qs = construirQueryString({ estado: 'EN_RUTA', cursor: 'abc123' });
    expect(qs).toContain('estado=EN_RUTA');
    expect(qs).toContain('cursor=abc123');
  });

  it('valores que requieren codificación URL', () => {
    const qs = construirQueryString({ estado: 'EN RUTA' });
    // URLSearchParams codifica el espacio como '+' (application/x-www-form-urlencoded),
    // que el servidor decodifica a espacio. Lo esencial: el espacio no queda literal.
    expect(qs).toContain('estado=EN+RUTA');
    expect(qs).not.toContain('EN RUTA');
  });

  it('omite undefined', () => {
    const qs = construirQueryString({ estado: 'EN_RUTA' });
    expect(qs).not.toContain('cursor');
    expect(qs).toContain('estado=EN_RUTA');
  });

  it('omite strings vacías', () => {
    const qs = construirQueryString({ estado: '', cursor: 'abc123' });
    expect(qs).not.toContain('estado');
    expect(qs).toContain('cursor=abc123');
  });
});
