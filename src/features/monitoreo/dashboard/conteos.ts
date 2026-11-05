import type { FilaViaje } from '@/lib/contracts/reportes';

export interface ConteoEnCurso {
  readonly estado: string;
  readonly conteo: number;
}

/**
 * Viajes en curso agrupados por estado, a partir de las filas completas de
 * `reporteViajes?en_curso=true`. La suma de los conteos coincide con el número de filas.
 * Orden alfabético por estado, para que la vista sea estable.
 */
export function conteosEnCurso(filas: readonly Pick<FilaViaje, 'estado'>[]): ConteoEnCurso[] {
  const porEstado = new Map<string, number>();
  for (const fila of filas) {
    porEstado.set(fila.estado, (porEstado.get(fila.estado) ?? 0) + 1);
  }
  return [...porEstado.entries()]
    .map(([estado, conteo]) => ({ estado, conteo }))
    .sort((a, b) => a.estado.localeCompare(b.estado));
}
