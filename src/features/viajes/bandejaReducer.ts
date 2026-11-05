/*
 * Reducer puro del estado de vista de la bandeja: filtro + paginación por cursor.
 *
 * La paginación del bff es por CURSOR OPACO, pero el control `Pagination` de la
 * librería es por NÚMERO DE PÁGINA. Para casar ambos sin inventar un control
 * propio, el estado de vista lleva:
 *   - `pagina`: número de página actual (base 1), estable para el control.
 *   - `cursores`: pila de cursores visitados. `cursores[i]` es el `cursor` que
 *     pide la página (i + 2); la página 1 no usa cursor. Así se puede ir atrás
 *     (reusar un cursor ya visto) y adelante (apilar el nuevo `cursor_siguiente`)
 *     de forma determinista.
 *
 * Reglas:
 *   - cambiarFiltro: reinicia a la página 1 y descarta los cursores (Req 4.5).
 *   - irAPagina: navega a una página adyacente usando la pila de cursores.
 */

import type { ParamsListarViajes } from '@/lib/api/viajes';

/** Estado de vista de la bandeja: filtro + posición de paginación. */
export interface EstadoVista {
  /** Estado seleccionado para filtrar, o undefined si no hay filtro. */
  readonly estado?: string;

  /** Número de página actual, base 1. */
  readonly pagina: number;

  /**
   * Pila de cursores visitados. `cursores[i]` es el `cursor` que solicita la
   * página (i + 2). La página 1 nunca usa cursor. La longitud de la pila refleja
   * cuántas páginas se han avanzado desde la primera.
   */
  readonly cursores: readonly string[];
}

/** Estado de vista inicial: primera página, sin filtro ni cursores. */
export const ESTADO_VISTA_INICIAL: EstadoVista = { pagina: 1, cursores: [] };

/** Acciones sobre el estado de vista. */
export type AccionVista =
  | { readonly tipo: 'cambiarFiltro'; readonly nuevoEstado: string | undefined }
  | {
      /** Navega a una página adyacente. `cursorSiguiente` es el que entregó la
       *  respuesta actual (solo se usa al avanzar a una página nueva). */
      readonly tipo: 'irAPagina';
      readonly pagina: number;
      readonly cursorSiguiente: string | null;
    };

/**
 * Reducer puro. Aplica las acciones al estado de vista.
 *
 * cambiarFiltro: reinicia la paginación (página 1, sin cursores) — Req 4.5.
 * irAPagina: avanza apilando el `cursor_siguiente` recibido, o retrocede
 *   recortando la pila. Solo se mueve a páginas adyacentes (como el control).
 */
export function reducir(estado: EstadoVista, accion: AccionVista): EstadoVista {
  switch (accion.tipo) {
    case 'cambiarFiltro':
      return {
        ...(accion.nuevoEstado !== undefined ? { estado: accion.nuevoEstado } : {}),
        pagina: 1,
        cursores: [],
      };

    case 'irAPagina': {
      const destino = accion.pagina;

      // Avanzar a la página siguiente: apila el cursor que entregó la respuesta actual.
      if (destino === estado.pagina + 1) {
        if (accion.cursorSiguiente === null) return estado; // no hay siguiente
        return {
          ...(estado.estado !== undefined ? { estado: estado.estado } : {}),
          pagina: destino,
          cursores: [...estado.cursores, accion.cursorSiguiente],
        };
      }

      // Retroceder: recorta la pila hasta la página destino. La página 1 queda
      // con la pila vacía (sin cursor).
      if (destino >= 1 && destino < estado.pagina) {
        return {
          ...(estado.estado !== undefined ? { estado: estado.estado } : {}),
          pagina: destino,
          cursores: estado.cursores.slice(0, destino - 1),
        };
      }

      // Cualquier otro salto (no adyacente o fuera de rango) no cambia el estado.
      return estado;
    }
  }
}

/**
 * Traduce el estado de vista a parámetros de query para la API. El cursor de la
 * página actual es el último de la pila; la página 1 no envía cursor (P10).
 */
export function paramsDesdeVista(estado: EstadoVista): ParamsListarViajes {
  const cursor = estado.cursores[estado.cursores.length - 1];
  return {
    ...(estado.estado !== undefined ? { estado: estado.estado } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
  };
}
