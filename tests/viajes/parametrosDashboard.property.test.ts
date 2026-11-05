/**
 * Parámetros válidos del dashboard (E8-T17, Bloque B, tarea 21): Property 9 y unitarias de
 * conteos y del rango de 7 días.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { consultaReporteViajes, type VistaDashboard } from '@/lib/api/reportes';
import { rangoUltimosSiete } from '@/features/monitoreo/dashboard/rangoUltimosSiete';
import { conteosEnCurso } from '@/features/monitoreo/dashboard/conteos';

const arbFecha = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-01-01'),
  noInvalidDate: true,
});

describe('Property 9: parámetros válidos de reporteViajes', () => {
  it('vista en curso: en_curso=true y sin desde ni hasta', () => {
    const consulta = consultaReporteViajes({ vista: 'en_curso' });
    expect(consulta).toBe('?en_curso=true');
    expect(consulta).not.toMatch(/desde|hasta/);
  });

  it('vista por rango: desde y hasta, y nunca en_curso', () => {
    fc.assert(
      fc.property(arbFecha, arbFecha, (a, b) => {
        const [desde, hasta] = a <= b ? [a, b] : [b, a];
        const vista: VistaDashboard = {
          vista: 'rango',
          desde: desde.toISOString(),
          hasta: hasta.toISOString(),
        };
        const consulta = consultaReporteViajes(vista);
        expect(consulta).toContain('desde=');
        expect(consulta).toContain('hasta=');
        expect(consulta).not.toContain('en_curso');
      }),
      { numRuns: 100 },
    );
  });
});

describe('rangoUltimosSiete', () => {
  it('desde < hasta, con diferencia exacta de 7 días, y hasta es ahora', () => {
    fc.assert(
      fc.property(arbFecha, (ahora) => {
        const { desde, hasta } = rangoUltimosSiete(ahora);
        expect(Date.parse(desde)).toBeLessThan(Date.parse(hasta));
        expect(Date.parse(hasta) - Date.parse(desde)).toBe(7 * 24 * 60 * 60 * 1000);
        expect(hasta).toBe(ahora.toISOString());
      }),
      { numRuns: 100 },
    );
  });
});

describe('conteosEnCurso', () => {
  it('la suma de los conteos coincide con el número de filas', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ estado: fc.constantFrom('ASIGNADO', 'EN_EMBARQUE', 'EN_DESTINO') }), {
          maxLength: 30,
        }),
        (filas) => {
          const suma = conteosEnCurso(filas).reduce((total, c) => total + c.conteo, 0);
          expect(suma).toBe(filas.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('agrupa por estado en orden alfabético', () => {
    expect(
      conteosEnCurso([{ estado: 'EN_EMBARQUE' }, { estado: 'ASIGNADO' }, { estado: 'ASIGNADO' }]),
    ).toEqual([
      { estado: 'ASIGNADO', conteo: 2 },
      { estado: 'EN_EMBARQUE', conteo: 1 },
    ]);
  });
});
