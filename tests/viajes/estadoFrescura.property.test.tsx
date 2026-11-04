/**
 * Frescura de la proyección (E8-T17, Bloque B, tarea 21): Property 3 y la DoD «una proyección
 * atrasada (`stale: true`) se muestra marcada como stale».
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';

import {
  estadoFrescura,
  type ProyeccionFrescura,
} from '@/features/monitoreo/dashboard/estadoFrescura';
import { IndicadorFrescura } from '@/features/monitoreo/dashboard/IndicadorFrescura';

/** Construye la proyección omitiendo las claves ausentes (exactOptionalPropertyTypes). */
function proyeccion(
  stale: boolean | undefined,
  proyeccionAl: string | null | undefined,
): ProyeccionFrescura {
  return {
    ...(stale === undefined ? {} : { stale }),
    ...(proyeccionAl === undefined ? {} : { proyeccion_al: proyeccionAl }),
  };
}

const arbStale = fc.oneof(fc.constant(undefined), fc.boolean());
const arbProyeccionAl = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc
    .date({ min: new Date('2020-01-01'), max: new Date('2030-01-01'), noInvalidDate: true })
    .map((d) => d.toISOString()),
);

describe('estadoFrescura · Property 3 (producto de stale × proyeccion_al)', () => {
  it('stale true → atrasada, sin importar proyeccion_al', () => {
    fc.assert(
      fc.property(arbProyeccionAl, (pAl) => {
        expect(estadoFrescura(proyeccion(true, pAl))).toBe('atrasada');
      }),
      { numRuns: 100 },
    );
  });

  it('sin stale true: proyeccion_al null o ausente → sin_datos', () => {
    fc.assert(
      fc.property(
        arbStale.filter((s) => s !== true),
        fc.constantFrom(undefined, null),
        (stale, pAl) => {
          expect(estadoFrescura(proyeccion(stale, pAl))).toBe('sin_datos');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('con proyeccion_al presente y sin stale true: ausente → no_informada, false → fresca', () => {
    fc.assert(
      fc.property(
        arbStale.filter((s) => s !== true),
        fc.date({ noInvalidDate: true }).map((d) => d.toISOString()),
        (stale, pAl) => {
          const esperado = stale === undefined ? 'no_informada' : 'fresca';
          expect(estadoFrescura(proyeccion(stale, pAl))).toBe(esperado);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('nunca clasifica como fresca una frescura no informada', () => {
    fc.assert(
      fc.property(
        fc.date({ noInvalidDate: true }).map((d) => d.toISOString()),
        (pAl) => {
          expect(estadoFrescura({ proyeccion_al: pAl })).not.toBe('fresca');
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('estadoFrescura · tabla explícita', () => {
  const pAl = '2026-11-04T10:00:00.000Z';
  it.each([
    ['stale true con proyeccion_al null', { stale: true, proyeccion_al: null }, 'atrasada'],
    ['stale true con proyeccion_al presente', { stale: true, proyeccion_al: pAl }, 'atrasada'],
    ['stale false con proyeccion_al presente', { stale: false, proyeccion_al: pAl }, 'fresca'],
    ['stale ausente con proyeccion_al presente', { proyeccion_al: pAl }, 'no_informada'],
    ['stale false con proyeccion_al null', { stale: false, proyeccion_al: null }, 'sin_datos'],
    ['todo ausente', {}, 'sin_datos'],
  ] as const)('%s → %s', (_nombre, entrada, esperado) => {
    expect(estadoFrescura(entrada)).toBe(esperado);
  });
});

describe('DoD: una proyección atrasada se muestra marcada como stale', () => {
  it('la vista muestra la marca y proyeccion_al, y no se parece a una proyección fresca', () => {
    const { unmount } = render(
      <IndicadorFrescura proyeccion={{ stale: true, proyeccion_al: '2026-11-04T10:00:00.000Z' }} />,
    );
    expect(screen.getByText('Datos atrasados')).toBeInTheDocument();
    expect(screen.getByText(/Proyección al/)).toBeInTheDocument();
    unmount();

    render(
      <IndicadorFrescura
        proyeccion={{ stale: false, proyeccion_al: '2026-11-04T10:00:00.000Z' }}
      />,
    );
    expect(screen.queryByText('Datos atrasados')).not.toBeInTheDocument();
  });

  it('frescura no informada y sin datos tienen textos propios', () => {
    const { unmount } = render(
      <IndicadorFrescura proyeccion={{ proyeccion_al: '2026-11-04T10:00:00.000Z' }} />,
    );
    expect(screen.getByText('Frescura no informada')).toBeInTheDocument();
    unmount();

    render(<IndicadorFrescura proyeccion={{ proyeccion_al: null }} />);
    expect(screen.getByText('Sin datos aplicados aún')).toBeInTheDocument();
  });
});
