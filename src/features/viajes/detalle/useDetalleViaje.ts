/*
 * Hook de datos del detalle del viaje (E8-T8).
 *
 * Conecta la lectura de detalle y mutaciones de transición/ETA con TanStack Query,
 * exponiendo un contrato plano que la presentación consume sin depender de Query.
 *
 * Operaciones:
 * - `useQuery` para lectura (`['viaje', id]`, `retry: false`)
 * - `useMutation` para transición (invalida la lectura al confirmar)
 * - `useMutation` para ETA (invalida la lectura al confirmar)
 *
 * 401 (`noAutorizado`) se expone como `esNoAutorizado` para que la presentación
 * lo delegue al flujo de sesión del AppShell (Req 7.3), sin pintar error genérico.
 *
 * Las acciones se derivan en tiempo real del estado actual mediante `accionesDesde`.
 */

import { useCallback } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import { completarFechaHora, fijarEta, obtenerDetalle, transicionar } from '@/lib/api/viajeDetalle';
import { ApiError } from '@/lib/api/errors';
import type { EstadoViaje, ViajeDetalle, ViajeInterno } from '@/lib/contracts/viajeDetalle';

import { accionesDesde } from './accionesTransicion';

/** Contrato plano que la presentación consume. */
export interface DetalleViajeHook {
  /** Viaje interno: id, estado, origen, destinos, eta_estimado, condiciones_activas. */
  readonly viaje: ViajeInterno | null;
  /** Condiciones activas del viaje (dato separado del estado). */
  readonly condicionesActivas: ViajeDetalle['condiciones_activas'];
  /** Acciones (transiciones) permitidas derivadas del estado actual. */
  readonly acciones: EstadoViaje[];
  /** true mientras la petición de lectura está en curso y no hay datos. */
  readonly cargando: boolean;
  /** Error de la petición de lectura, o null si no hubo. */
  readonly error: Error | null;
  /** true si el fallo fue 401/403: la presentación delega a sesión. */
  readonly esNoAutorizado: boolean;
  /** Reintenta la lectura (mismo queryKey). */
  readonly reintentar: () => void;
  /** Transiciona el viaje a un nuevo estado. Invalida la lectura. */
  readonly transicionar: (a_estado: EstadoViaje, causa?: string) => Promise<void>;
  /** Fija el ETA estimado manual. Invalida la lectura. */
  readonly fijarEta: (eta_estimado: string) => Promise<void>;
  /** Completa/edita la fecha/hora del servicio (E8-T9). Invalida la lectura. */
  readonly completarFechaHora: (fecha_hora_servicio: string) => Promise<void>;
}

export function useDetalleViaje(id: string): DetalleViajeHook {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  const queryClient = useQueryClient();

  // Lectura de detalle (devuelve ViajeDetalle completo con condiciones_activas)
  const query = useQuery({
    queryKey: ['viaje', id],
    queryFn: () => obtenerDetalle(id, accessToken),
    retry: false,
  });

  const viajeInterno = query.data?.viaje ?? null;
  const condicionesActivas = query.data?.condiciones_activas ?? [];
  const error = query.isError ? (query.error as Error) : null;
  const esNoAutorizado = query.error instanceof ApiError && query.error.kind === 'noAutorizado';

  // Derivar acciones del estado actual
  const acciones =
    viajeInterno && viajeInterno.estado ? accionesDesde(viajeInterno.estado as EstadoViaje) : [];

  // Mutación de transición
  const mutacionTransicion = useMutation({
    mutationFn: async ({ a_estado, causa }: { a_estado: EstadoViaje; causa?: string }) => {
      const entrada = causa ? { a_estado, causa } : { a_estado };
      return transicionar(id, entrada, accessToken);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['viaje', id] });
    },
  });

  // Mutación de ETA
  const mutacionEta = useMutation({
    mutationFn: async ({ eta_estimado }: { eta_estimado: string }) =>
      fijarEta(id, { eta_estimado }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['viaje', id] });
    },
  });

  // Mutación de completar fecha/hora del servicio (E8-T9).
  const mutacionFechaHora = useMutation({
    mutationFn: async ({ fecha_hora_servicio }: { fecha_hora_servicio: string }) =>
      completarFechaHora(id, { fecha_hora_servicio }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['viaje', id] });
    },
  });

  // Wrappers públicos para las mutaciones
  const transicionarHandler = useCallback(
    async (a_estado: EstadoViaje, causa?: string) => {
      await mutacionTransicion.mutateAsync({ a_estado, ...(causa && { causa }) });
    },
    [mutacionTransicion],
  );

  const fijarEtaHandler = useCallback(
    async (eta_estimado: string) => {
      await mutacionEta.mutateAsync({ eta_estimado });
    },
    [mutacionEta],
  );

  const completarFechaHoraHandler = useCallback(
    async (fecha_hora_servicio: string) => {
      await mutacionFechaHora.mutateAsync({ fecha_hora_servicio });
    },
    [mutacionFechaHora],
  );

  return {
    viaje: viajeInterno,
    condicionesActivas,
    acciones,
    cargando: query.isPending,
    error,
    esNoAutorizado,
    reintentar: () => void query.refetch(),
    transicionar: transicionarHandler,
    fijarEta: fijarEtaHandler,
    completarFechaHora: completarFechaHoraHandler,
  };
}
