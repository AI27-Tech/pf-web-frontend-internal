/**
 * Funciones puras de evidencia (E8-T17, Bloque C, tarea 29): SHA-256, vigencia de URL,
 * descargabilidad y sondeo. Incluye Property 6 (URL efímera), Property 7 (adjunto no limpio
 * no ofrece descarga) y Property 8 (sondeo acotado).
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { esDescargable } from '@/features/viajes/evidencia/adjuntoDescargable';
import { calcularSha256 } from '@/features/viajes/evidencia/calcularSha256';
import { hayEscaneoPendiente } from '@/features/viajes/evidencia/sondeoEscaneo';
import { urlVigente } from '@/features/viajes/evidencia/vigenciaUrl';
import type { EstadoEscaneo } from '@/lib/contracts/adjuntos';

const ESTADOS: readonly EstadoEscaneo[] = ['pendiente', 'limpio', 'infectado'];
const arbEstado = fc.constantFrom(...ESTADOS);

describe('calcularSha256', () => {
  it('cadena vacía → e3b0c442…b855', async () => {
    expect(await calcularSha256(new Blob([]))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('"abc" → ba7816bf…15ad', async () => {
    expect(await calcularSha256(new Blob(['abc']))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('devuelve 64 caracteres hexadecimales en minúscula', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ maxLength: 512 }), async (bytes) => {
        const hash = await calcularSha256(new Blob([bytes]));
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
      }),
      { numRuns: 100 },
    );
  });
});

describe('urlVigente (Property 6: URL efímera)', () => {
  it('la frontera exacta no es vigente: expira_en igual a ahora', () => {
    const ahora = Date.parse('2026-11-04T12:00:00.000Z');
    expect(urlVigente('2026-11-04T12:00:00.000Z', ahora)).toBe(false);
    expect(urlVigente('2026-11-04T12:00:00.001Z', ahora)).toBe(true);
  });

  it('es vigente solo si expira_en cae estrictamente después de ahora, para instantes pasados y futuros', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4_102_444_800_000 }),
        fc.integer({ min: 0, max: 4_102_444_800_000 }),
        (expiraMs, ahoraMs) => {
          const expiraEn = new Date(expiraMs).toISOString();
          expect(urlVigente(expiraEn, ahoraMs)).toBe(expiraMs > ahoraMs);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('esDescargable (Property 7: un adjunto no limpio no ofrece descarga)', () => {
  it('solo limpio ofrece descarga, para cualquiera de los tres estados', () => {
    fc.assert(
      fc.property(arbEstado, (estado) => {
        expect(esDescargable(estado)).toBe(estado === 'limpio');
      }),
      { numRuns: 100 },
    );
  });
});

describe('hayEscaneoPendiente (Property 8: sondeo acotado)', () => {
  it('está activo si y solo si hay al menos un adjunto pendiente', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ estado_escaneo: arbEstado }), { maxLength: 20 }),
        (items) => {
          const hayPendiente = items.some((item) => item.estado_escaneo === 'pendiente');
          expect(hayEscaneoPendiente(items)).toBe(hayPendiente);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('con 0 pendientes, incluida la lista vacía, el sondeo se detiene', () => {
    expect(hayEscaneoPendiente([])).toBe(false);
    expect(
      hayEscaneoPendiente([{ estado_escaneo: 'limpio' }, { estado_escaneo: 'infectado' }]),
    ).toBe(false);
  });
});
