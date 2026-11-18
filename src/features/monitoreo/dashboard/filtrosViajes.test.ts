import { describe, expect, it } from 'vitest';

import {
  FILTROS_INICIALES,
  filtrarViajes,
  inicioPeriodo,
  type FilaFiltrable,
} from './filtrosViajes';

// Viernes 13 de noviembre de 2026, 15:00 en hora local. Las fechas se construyen en hora local
// para que las pruebas no dependan de la zona horaria de la máquina.
const AHORA = new Date(2026, 10, 13, 15);

const FILAS: FilaFiltrable[] = [
  { estado: 'EN_TRANSITO', creado_en: new Date(2026, 10, 13, 9).toISOString(), cerrado_en: null },
  {
    estado: 'CERRADO',
    creado_en: new Date(2026, 10, 9, 8).toISOString(),
    cerrado_en: new Date(2026, 10, 13, 10).toISOString(),
  },
  {
    estado: 'CERRADO',
    creado_en: new Date(2026, 10, 2, 8).toISOString(),
    cerrado_en: new Date(2026, 10, 3, 10).toISOString(),
  },
  { estado: 'APROBADO', creado_en: new Date(2026, 9, 31, 23).toISOString(), cerrado_en: null },
];

describe('inicioPeriodo', () => {
  it('«todos» no tiene inicio', () => {
    expect(inicioPeriodo('todos', AHORA)).toBeNull();
  });

  it('«hoy» empieza a las 00:00 de hoy', () => {
    expect(inicioPeriodo('hoy', AHORA)).toEqual(new Date(2026, 10, 13, 0, 0, 0, 0));
  });

  it('«semana» empieza el lunes de la semana', () => {
    expect(inicioPeriodo('semana', AHORA)).toEqual(new Date(2026, 10, 9, 0, 0, 0, 0));
  });

  it('«mes» empieza el día 1', () => {
    expect(inicioPeriodo('mes', AHORA)).toEqual(new Date(2026, 10, 1, 0, 0, 0, 0));
  });
});

describe('filtrarViajes', () => {
  it('sin filtros devuelve todas las filas en el mismo orden', () => {
    expect(filtrarViajes(FILAS, FILTROS_INICIALES, AHORA)).toEqual(FILAS);
  });

  it('filtra por estado', () => {
    const filas = filtrarViajes(FILAS, { ...FILTROS_INICIALES, estado: 'CERRADO' }, AHORA);
    expect(filas).toHaveLength(2);
    expect(filas.every((f) => f.estado === 'CERRADO')).toBe(true);
  });

  it('con «hoy» entra la fila creada hoy y la cerrada hoy', () => {
    const filas = filtrarViajes(FILAS, { ...FILTROS_INICIALES, periodo: 'hoy' }, AHORA);
    expect(filas.map((f) => f.estado)).toEqual(['EN_TRANSITO', 'CERRADO']);
  });

  it('con «esta semana» entra si la creación o el cierre caen en la semana', () => {
    const filas = filtrarViajes(FILAS, { ...FILTROS_INICIALES, periodo: 'semana' }, AHORA);
    expect(filas.map((f) => f.estado)).toEqual(['EN_TRANSITO', 'CERRADO']);
  });

  it('con «este mes» entra si la creación o el cierre caen en el mes; sin fecha no entra', () => {
    const filas = filtrarViajes(FILAS, { ...FILTROS_INICIALES, periodo: 'mes' }, AHORA);
    expect(filas.map((f) => f.estado)).toEqual(['EN_TRANSITO', 'CERRADO', 'CERRADO']);
  });

  it('combina estado y periodo', () => {
    const filas = filtrarViajes(FILAS, { estado: 'APROBADO', periodo: 'hoy' }, AHORA);
    expect(filas).toEqual([]);
  });
});
