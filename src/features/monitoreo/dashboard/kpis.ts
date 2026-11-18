import type { FilaViaje } from '@/lib/contracts/reportes';

import { distribucionPorEstado, type ConteoPorEstado } from './distribucion';

/** KPIs de la vista «En curso». Cifras derivadas de los conteos ya cargados. */
export interface KpisEnCurso {
  /** Viajes en curso: suma de los conteos, igual al número de filas. */
  readonly total: number;
  /** Estado con más viajes (empate: el primero en orden alfabético). `null` si no hay viajes. */
  readonly predominante: ConteoPorEstado | null;
  /** Número de estados distintos con al menos un viaje. */
  readonly estadosActivos: number;
}

/** KPIs de la vista «Últimos 7 días». */
export interface KpisRango {
  /** Filas del reporte de viajes del periodo. */
  readonly viajes: number;
  /** Suma de los conteos de `reporteEstados`: cambios de estado en el periodo. */
  readonly cambiosDeEstado: number;
  /** Filas con `cerrado_en` distinto de null. */
  readonly cerrados: number;
}

export function kpisEnCurso(conteos: readonly ConteoPorEstado[]): KpisEnCurso {
  const conConteo = conteos.filter((c) => c.conteo > 0);
  const total = conConteo.reduce((suma, c) => suma + c.conteo, 0);
  const [primero] = distribucionPorEstado(conConteo);
  return {
    total,
    predominante: primero ? { estado: primero.estado, conteo: primero.conteo } : null,
    estadosActivos: conConteo.length,
  };
}

export function kpisRango(
  filas: readonly Pick<FilaViaje, 'cerrado_en'>[],
  conteosEstados: readonly Pick<ConteoPorEstado, 'conteo'>[],
): KpisRango {
  return {
    viajes: filas.length,
    cambiosDeEstado: conteosEstados.reduce((suma, c) => suma + c.conteo, 0),
    cerrados: filas.filter((f) => f.cerrado_en !== null && f.cerrado_en !== undefined).length,
  };
}

/** Viajes de un estado concreto. Devuelve 0 si el estado no aparece en los conteos. */
export function conteoDeEstado(conteos: readonly ConteoPorEstado[], estado: string): number {
  return conteos.find((c) => c.estado === estado)?.conteo ?? 0;
}
