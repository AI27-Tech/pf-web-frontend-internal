/*
 * Hook de datos del detalle del viaje (E8-T8, E8-T10).
 *
 * Conecta la lectura del detalle, el roster y las mutaciones con TanStack Query,
 * exponiendo un contrato plano que la presentación consume sin depender de Query.
 * La consulta del roster se habilita solo cuando el modal de asignación está
 * abierto, para no pedir datos que la pantalla todavía no necesita.
 */

import { useCallback } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import { listarUnidades } from '@/lib/api/unidades';
import { ApiError } from '@/lib/api/errors';
import {
  asignarEscolta,
  completarFechaHora,
  fijarEta,
  obtenerDetalle,
  transicionar,
} from '@/lib/api/viajeDetalle';
import type { Unidad } from '@/lib/contracts/unidades';
import type { EstadoViaje, ViajeDetalle, ViajeInterno } from '@/lib/contracts/viajeDetalle';

import { accionesDesde } from './accionesTransicion';

export interface UseDetalleViajeOptions {
  /** Habilita la lectura del roster cuando el formulario de asignación está abierto. */
  readonly habilitarRoster?: boolean;
}

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
  /** true si cualquier operación activa requiere delegar la sesión. */
  readonly esNoAutorizado: boolean;
  /** Reintenta la lectura del detalle. */
  readonly reintentar: () => void;
  /** Transiciona el viaje a un nuevo estado. Invalida la lectura. */
  readonly transicionar: (a_estado: EstadoViaje, causa?: string) => Promise<void>;
  /** Fija el ETA estimado manual. Invalida la lectura. */
  readonly fijarEta: (eta_estimado: string) => Promise<void>;
  /** Completa/edita la fecha/hora del servicio (E8-T9). */
  readonly completarFechaHora: (fecha_hora_servicio: string) => Promise<void>;
  /** Unidades disponibles en el roster cuando el formulario está habilitado. */
  readonly unidades: Unidad[];
  /** true mientras carga el roster. */
  readonly cargandoUnidades: boolean;
  /** Error al cargar el roster, o null si no hubo. */
  readonly errorUnidades: Error | null;
  /** Reintenta la lectura del roster. */
  readonly reintentarUnidades: () => void;
  /** true mientras la asignación atómica está en curso. */
  readonly asignandoEscolta: boolean;
  /** Error de la última asignación, o null si no hubo. */
  readonly errorAsignacion: Error | null;
  /** Reserva las unidades seleccionadas e invalida detalle y roster. */
  readonly asignarEscolta: (unidades_ids: string[]) => Promise<void>;
}

export function useDetalleViaje(
  id: string,
  options: UseDetalleViajeOptions = {},
): DetalleViajeHook {
  const { habilitarRoster = false } = options;
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['viaje', id],
    queryFn: () => obtenerDetalle(id, accessToken),
    retry: false,
  });

  const rosterQuery = useQuery({
    queryKey: ['unidades'],
    queryFn: () => listarUnidades(accessToken),
    enabled: habilitarRoster,
    retry: false,
  });

  const viajeInterno = query.data?.viaje ?? null;
  const condicionesActivas = query.data?.condiciones_activas ?? [];
  const error = query.isError ? (query.error as Error) : null;
  const errorUnidades = rosterQuery.isError ? (rosterQuery.error as Error) : null;

  const acciones =
    viajeInterno && viajeInterno.estado ? accionesDesde(viajeInterno.estado as EstadoViaje) : [];

  const mutacionTransicion = useMutation({
    mutationFn: async ({ a_estado, causa }: { a_estado: EstadoViaje; causa?: string }) => {
      const entrada = causa ? { a_estado, causa } : { a_estado };
      return transicionar(id, entrada, accessToken);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['viaje', id] });
    },
  });

  const mutacionEta = useMutation({
    mutationFn: async ({ eta_estimado }: { eta_estimado: string }) =>
      fijarEta(id, { eta_estimado }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['viaje', id] });
    },
  });

  const mutacionFechaHora = useMutation({
    mutationFn: async ({ fecha_hora_servicio }: { fecha_hora_servicio: string }) =>
      completarFechaHora(id, { fecha_hora_servicio }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['viaje', id] });
    },
  });

  const mutacionAsignacion = useMutation({
    mutationFn: async ({ unidades_ids }: { unidades_ids: string[] }) => {
      if (unidades_ids.length === 0) {
        throw new Error('Selecciona al menos una unidad para asignar.');
      }
      return asignarEscolta(id, { unidades_ids }, accessToken);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['viaje', id] });
      void queryClient.invalidateQueries({ queryKey: ['unidades'] });
    },
    onError: (mutationError) => {
      // Una carrera exige que ambos datos vuelvan a reflejar el servidor.
      if (mutationError instanceof ApiError && mutationError.kind === 'conflicto') {
        void queryClient.invalidateQueries({ queryKey: ['viaje', id] });
        void queryClient.invalidateQueries({ queryKey: ['unidades'] });
      }
    },
  });

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

  const asignarEscoltaHandler = useCallback(
    async (unidades_ids: string[]) => {
      await mutacionAsignacion.mutateAsync({ unidades_ids });
    },
    [mutacionAsignacion],
  );

  const esNoAutorizado =
    (query.error instanceof ApiError && query.error.kind === 'noAutorizado') ||
    (rosterQuery.error instanceof ApiError && rosterQuery.error.kind === 'noAutorizado') ||
    (mutacionAsignacion.error instanceof ApiError &&
      mutacionAsignacion.error.kind === 'noAutorizado');

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
    unidades: rosterQuery.data ?? [],
    cargandoUnidades: habilitarRoster && rosterQuery.isPending,
    errorUnidades,
    reintentarUnidades: () => void rosterQuery.refetch(),
    asignandoEscolta: mutacionAsignacion.isPending,
    errorAsignacion: mutacionAsignacion.error as Error | null,
    asignarEscolta: asignarEscoltaHandler,
  };
}
