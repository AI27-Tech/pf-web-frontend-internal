/*
 * Paginación por cursor del listado de usuarios (tarea 8.1). Función pura.
 *
 * El contrato pagina con cursor opaco y no da el total. El estado guarda la página
 * actual y el cursor con que se pidió cada página visitada, para volver atrás sin
 * repetir la consulta a ciegas. Cambiar un filtro reinicia la paginación.
 */

export interface EstadoPaginacion {
  /** Página actual, desde 0. */
  readonly pagina: number;
  /** Cursor con que se pidió cada página visitada; el de la página 0 no tiene cursor. */
  readonly cursores: readonly (string | undefined)[];
}

export type AccionPaginacion =
  | { readonly tipo: 'siguiente'; readonly cursorSiguiente: string }
  | { readonly tipo: 'anterior' }
  | { readonly tipo: 'reiniciar' };

export const PAGINACION_INICIAL: EstadoPaginacion = { pagina: 0, cursores: [undefined] };

export function reducirPaginacion(
  estado: EstadoPaginacion,
  accion: AccionPaginacion,
): EstadoPaginacion {
  switch (accion.tipo) {
    case 'siguiente':
      return {
        pagina: estado.pagina + 1,
        cursores: [...estado.cursores.slice(0, estado.pagina + 1), accion.cursorSiguiente],
      };
    case 'anterior':
      return estado.pagina === 0 ? estado : { ...estado, pagina: estado.pagina - 1 };
    case 'reiniciar':
      return PAGINACION_INICIAL;
  }
}

/** Cursor a pedir para la página actual. */
export function cursorDePagina(estado: EstadoPaginacion): string | undefined {
  return estado.cursores[estado.pagina];
}
