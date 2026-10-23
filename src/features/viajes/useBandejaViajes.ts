/*
 * Hook de datos de la bandeja de viajes (E8-T7).
 *
 * Conecta el estado de vista (reducer puro: filtro + cursor) con TanStack Query
 * y expone a la presentación un contrato plano: filas, cursor, estados de UI y
 * acciones. No filtra ni reordena nada (P10): la query refleja lo que el bff
 * devuelve, adaptado por `adaptarPagina`.
 *
 * - `queryKey: ['viajes', params]` → cambiar filtro o cursor dispara refetch.
 * - `retry: false` → el error es inmediato y el reintento es explícito (Req 7.2).
 * - 401 (`noAutorizado`) se expone como `esNoAutorizado` para que la presentación
 *   lo delegue al flujo de sesión del AppShell (Req 7.3), sin pintar error genérico.
 */

import { useReducer } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import { ApiError } from '@/lib/api/errors';
import { listarViajes } from '@/lib/api/viajes';

import { ESTADO_VISTA_INICIAL, paramsDesdeVista, reducir } from './bandejaReducer';
import { adaptarPagina, type ViajeVista } from './viajeVista';

/** Contrato plano que la presentación consume. */
export interface BandejaViajes {
  /** Filas a renderizar, en el orden en que el bff las entrega (P10). */
  readonly filas: readonly ViajeVista[];
  /** Cursor para la siguiente página, o null si no hay más (Req 4.1/4.3). */
  readonly cursorSiguiente: string | null;
  /** Número de página actual, base 1 (para el control de paginación). */
  readonly pagina: number;
  /** Estado seleccionado en el filtro, o undefined si no hay filtro. */
  readonly estadoSeleccionado: string | undefined;
  /** true mientras la petición está en curso y aún no hay datos (Req 5.1). */
  readonly cargando: boolean;
  /** Error de la petición, o null si no hubo (Req 7.1). */
  readonly error: Error | null;
  /** true si el fallo fue 401/403: la presentación delega a sesión (Req 7.3). */
  readonly esNoAutorizado: boolean;
  /** Reintenta con el filtro vigente (mismo queryKey, Req 7.2). */
  readonly reintentar: () => void;
  /** Cambia el filtro de estado; reinicia la paginación (Req 3.2/3.3/4.5). */
  readonly cambiarFiltro: (estado: string | undefined) => void;
  /**
   * Navega a una página adyacente (base 1). Avanzar usa el `cursor_siguiente`
   * recibido; retroceder reusa el cursor ya visitado (Req 4.1/4.2/4.3).
   */
  readonly irAPagina: (pagina: number) => void;
}

export function useBandejaViajes(): BandejaViajes {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';

  const [vista, dispatch] = useReducer(reducir, ESTADO_VISTA_INICIAL);
  const params = paramsDesdeVista(vista);

  const query = useQuery({
    queryKey: ['viajes', params],
    queryFn: () => listarViajes(params, accessToken),
    retry: false,
  });

  const datos = query.data ? adaptarPagina(query.data) : undefined;
  const error = query.isError ? (query.error as Error) : null;
  const cursorSiguiente = datos?.cursorSiguiente ?? null;

  return {
    filas: datos?.filas ?? [],
    cursorSiguiente,
    pagina: vista.pagina,
    estadoSeleccionado: vista.estado,
    cargando: query.isPending,
    error,
    esNoAutorizado: query.error instanceof ApiError && query.error.kind === 'noAutorizado',
    reintentar: () => void query.refetch(),
    cambiarFiltro: (estado) => dispatch({ tipo: 'cambiarFiltro', nuevoEstado: estado }),
    irAPagina: (pagina) => dispatch({ tipo: 'irAPagina', pagina, cursorSiguiente }),
  };
}
