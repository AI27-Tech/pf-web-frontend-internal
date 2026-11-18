/** Conteo de viajes por estado, tal como lo entregan `conteosEnCurso` o `reporteEstados`. */
export interface ConteoPorEstado {
  readonly estado: string;
  readonly conteo: number;
}

/** Fila de la distribución con su porcentaje entero sobre el total. */
export interface FilaDistribucion extends ConteoPorEstado {
  readonly porcentaje: number;
}

/**
 * Porcentaje entero de cada estado sobre el total. Si el total es 0, todos los porcentajes son 0
 * (la tarjeta muestra `EmptyState` en ese caso, no esta función).
 *
 * Orden: conteo descendente y, a igualdad, alfabético por estado. El orden es determinista.
 */
export function distribucionPorEstado(conteos: readonly ConteoPorEstado[]): FilaDistribucion[] {
  const total = conteos.reduce((suma, c) => suma + c.conteo, 0);
  return conteos
    .map((c) => ({
      estado: c.estado,
      conteo: c.conteo,
      porcentaje: total > 0 ? Math.round((c.conteo * 100) / total) : 0,
    }))
    .sort((a, b) => {
      if (a.conteo !== b.conteo) return b.conteo - a.conteo;
      if (a.estado === b.estado) return 0;
      return a.estado < b.estado ? -1 : 1;
    });
}
