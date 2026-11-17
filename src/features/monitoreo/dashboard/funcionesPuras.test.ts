/**
 * Pruebas de las funciones puras del dashboard de monitoreo. Cubren las propiedades 1 a 7 del
 * design.md y la cobertura del mapa de badges frente al enum generado.
 */
import { describe, expect, it } from 'vitest';

import { EstadoViaje } from '@/lib/contracts/viajeDetalle';

const TODOS_LOS_ESTADOS = Object.values(EstadoViaje);

import { ESTADO_BADGE, badgeDeEstado } from './estadoBadge';
import { distribucionPorEstado } from './distribucion';
import { conteoDeEstado, kpisEnCurso, kpisRango } from './kpis';
import { ajustarPagina, paginar } from './paginar';

describe('estadoBadge (propiedad 3)', () => {
  it('cubre todos los tokens del enum generado', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      expect(ESTADO_BADGE).toHaveProperty([estado]);
    }
    expect(Object.keys(ESTADO_BADGE)).toHaveLength(TODOS_LOS_ESTADOS.length);
  });

  it('solo los viajes en tránsito llevan punto y pulso', () => {
    const conPunto = TODOS_LOS_ESTADOS.filter((e) => ESTADO_BADGE[e].dot);
    const conPulso = TODOS_LOS_ESTADOS.filter((e) => ESTADO_BADGE[e].pulse);
    expect(conPunto).toEqual([EstadoViaje.EnTransito]);
    expect(conPulso).toEqual([EstadoViaje.EnTransito]);
  });

  it('no usa la apariencia solid en ningún estado', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      expect(ESTADO_BADGE[estado].appearance).not.toBe('solid');
    }
  });
  it('devuelve neutral para un token desconocido sin lanzar error', () => {
    expect(badgeDeEstado('ESTADO_NUEVO_DEL_BFF')).toEqual({
      variant: 'neutral',
      appearance: 'soft',
      dot: false,
      pulse: false,
    });
  });

  it('no trata claves del prototipo como estados', () => {
    expect(badgeDeEstado('constructor').variant).toBe('neutral');
    expect(badgeDeEstado('__proto__').variant).toBe('neutral');
  });

  it('devuelve el descriptor del estado conocido', () => {
    expect(badgeDeEstado(EstadoViaje.RechazadoPorAi27).variant).toBe('alert');
  });
});

describe('distribucionPorEstado (propiedades 1 y 2)', () => {
  it('calcula porcentajes enteros entre 0 y 100 y conserva los conteos', () => {
    const filas = distribucionPorEstado([
      { estado: 'A', conteo: 1 },
      { estado: 'B', conteo: 2 },
      { estado: 'C', conteo: 4 },
    ]);
    for (const fila of filas) {
      expect(fila.porcentaje).toBeGreaterThanOrEqual(0);
      expect(fila.porcentaje).toBeLessThanOrEqual(100);
      expect(Number.isInteger(fila.porcentaje)).toBe(true);
    }
    expect(filas.reduce((s, f) => s + f.conteo, 0)).toBe(7);
    expect(filas.find((f) => f.estado === 'C')?.porcentaje).toBe(57);
  });

  it('ordena por conteo descendente y, a igualdad, alfabético', () => {
    const filas = distribucionPorEstado([
      { estado: 'Z', conteo: 2 },
      { estado: 'M', conteo: 5 },
      { estado: 'A', conteo: 2 },
    ]);
    expect(filas.map((f) => f.estado)).toEqual(['M', 'A', 'Z']);
  });

  it('con total 0 devuelve porcentajes en 0 sin dividir entre cero', () => {
    const filas = distribucionPorEstado([{ estado: 'A', conteo: 0 }]);
    expect(filas).toEqual([{ estado: 'A', conteo: 0, porcentaje: 0 }]);
  });

  it('es determinista para la misma entrada', () => {
    const entrada = [
      { estado: 'B', conteo: 1 },
      { estado: 'A', conteo: 1 },
    ];
    expect(distribucionPorEstado(entrada)).toEqual(distribucionPorEstado(entrada));
  });
});

describe('kpis (propiedades 5 y 6)', () => {
  it('en curso: el total es la suma de conteos y el predominante tiene el máximo', () => {
    const kpis = kpisEnCurso([
      { estado: 'EN_TRANSITO', conteo: 3 },
      { estado: 'CERRADO', conteo: 1 },
      { estado: 'ASIGNADO', conteo: 3 },
    ]);
    expect(kpis.total).toBe(7);
    expect(kpis.estadosActivos).toBe(3);
    expect(kpis.predominante).toEqual({ estado: 'ASIGNADO', conteo: 3 });
  });

  it('en curso sin viajes: sin predominante', () => {
    expect(kpisEnCurso([])).toEqual({ total: 0, predominante: null, estadosActivos: 0 });
  });

  it('rango: cerrados cuenta filas con cerrado_en no nulo', () => {
    const kpis = kpisRango(
      [
        { cerrado_en: '2026-11-10T10:00:00Z' },
        { cerrado_en: null },
        { cerrado_en: '2026-11-11T10:00:00Z' },
      ],
      [{ conteo: 4 }, { conteo: 6 }],
    );
    expect(kpis).toEqual({ viajes: 3, cambiosDeEstado: 10, cerrados: 2 });
  });
});

describe('paginar y ajustarPagina (propiedad 4)', () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);

  it('devuelve a lo sumo tamano elementos y la unión de páginas es la lista original', () => {
    const paginas = Math.ceil(items.length / 10);
    const unidas: number[] = [];
    for (let p = 1; p <= paginas; p += 1) {
      const pagina = paginar(items, p, 10);
      expect(pagina.length).toBeLessThanOrEqual(10);
      unidas.push(...pagina);
    }
    expect(unidas).toEqual(items);
  });

  it('ajusta una página fuera de rango a la última válida', () => {
    expect(paginar(items, 99, 10)).toEqual([21, 22, 23]);
    expect(ajustarPagina(99, 23, 10)).toBe(3);
  });

  it('con lista vacía la página válida es 1', () => {
    expect(ajustarPagina(5, 0, 10)).toBe(1);
    expect(paginar([], 1, 10)).toEqual([]);
  });

  it('siempre devuelve una página en el rango válido', () => {
    for (const pagina of [-3, 0, 1, 2, 3, 50]) {
      const ajustada = ajustarPagina(pagina, 23, 10);
      expect(ajustada).toBeGreaterThanOrEqual(1);
      expect(ajustada).toBeLessThanOrEqual(3);
    }
  });
});

describe('conteoDeEstado', () => {
  it('devuelve el conteo del estado pedido', () => {
    expect(conteoDeEstado([{ estado: 'EN_TRANSITO', conteo: 4 }], 'EN_TRANSITO')).toBe(4);
  });

  it('devuelve 0 si el estado no está en los conteos', () => {
    expect(conteoDeEstado([{ estado: 'CERRADO', conteo: 2 }], 'EN_TRANSITO')).toBe(0);
  });
});
