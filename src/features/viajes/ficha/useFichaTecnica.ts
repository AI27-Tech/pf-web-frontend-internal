/*
 * Estado de lectura, catálogo y guardado de la ficha técnica (E8-T12).
 *
 * La ficha y el detalle son recursos distintos. La mutación actualiza la ficha
 * únicamente con la respuesta confirmada por el BFF.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import { ApiError, esProhibido, esSesionInvalida } from '@/lib/api/errors';
import { guardarFicha, listarGps, obtenerFicha } from '@/lib/api/fichaTecnica';
import { obtenerAsignacion, obtenerDetalle } from '@/lib/api/viajeDetalle';
import type {
  DispositivoGps,
  FichaTecnica,
  FichaTecnicaEntrada,
} from '@/lib/contracts/fichaTecnica';
import type { Unidad } from '@/lib/contracts/unidades';
import type { ViajeDetalle } from '@/lib/contracts/viajeDetalle';

export interface FichaTecnicaHook {
  readonly detalle: ViajeDetalle | null;
  readonly ficha: FichaTecnica | null;
  readonly gps: DispositivoGps[];
  readonly escolta: Unidad[];
  readonly cargando: boolean;
  readonly cargandoGps: boolean;
  readonly cargandoEscolta: boolean;
  readonly fichaVacia: boolean;
  readonly error: Error | null;
  readonly errorGps: Error | null;
  readonly errorEscolta: Error | null;
  readonly errorGuardado: Error | null;
  /** 401 o sesión cortada: la pantalla delega al flujo de sesión. */
  readonly esNoAutorizado: boolean;
  /** 403 en el detalle o la ficha: sin permiso para esta ficha; la sesión sigue. */
  readonly esProhibido: boolean;
  readonly guardando: boolean;
  readonly reintentar: () => void;
  readonly reintentarGps: () => void;
  readonly reintentarEscolta: () => void;
  readonly guardar: (entrada: FichaTecnicaEntrada) => Promise<FichaTecnica>;
}

export function useFichaTecnica(id: string): FichaTecnicaHook {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  const queryClient = useQueryClient();

  const detalleQuery = useQuery({
    queryKey: ['viaje', id],
    queryFn: () => obtenerDetalle(id, accessToken),
    retry: false,
    enabled: accessToken.length > 0,
  });

  const fichaQuery = useQuery({
    queryKey: ['ficha', id],
    queryFn: () => obtenerFicha(id, accessToken),
    retry: false,
    enabled: accessToken.length > 0,
  });

  const gpsQuery = useQuery({
    queryKey: ['gps'],
    queryFn: () => listarGps(accessToken),
    retry: false,
    enabled: accessToken.length > 0,
  });

  // Escolta en solo lectura: la de ESTE viaje (`obtenerAsignacion`, tracer.39), no
  // el roster completo, que el monitorista no puede leer (DEC-142). La clave cuelga
  // de ['viaje', id] para que asignar o reasignar la invalide junto con el detalle.
  const escoltaQuery = useQuery({
    queryKey: ['viaje', id, 'escolta'],
    queryFn: async () => (await obtenerAsignacion(id, accessToken)).unidades,
    retry: false,
    enabled: accessToken.length > 0,
  });

  const mutation = useMutation({
    mutationFn: (entrada: FichaTecnicaEntrada) => guardarFicha(id, entrada, accessToken),
    retry: false,
    onSuccess: (ficha) => {
      queryClient.setQueryData(['ficha', id], ficha);
    },
  });

  const fichaError = fichaQuery.error as Error | null;
  const fichaVacia = fichaError instanceof ApiError && fichaError.kind === 'noEncontrado';
  const error = detalleQuery.error
    ? (detalleQuery.error as Error)
    : fichaError && !fichaVacia
      ? fichaError
      : null;

  return {
    detalle: detalleQuery.data ?? null,
    ficha: fichaQuery.data ?? null,
    gps: gpsQuery.data ?? [],
    escolta: escoltaQuery.data ?? [],
    cargando: detalleQuery.isPending || fichaQuery.isPending,
    cargandoGps: gpsQuery.isPending,
    cargandoEscolta: escoltaQuery.isPending,
    fichaVacia,
    error,
    errorGps: gpsQuery.isError ? (gpsQuery.error as Error) : null,
    errorEscolta: escoltaQuery.isError ? (escoltaQuery.error as Error) : null,
    errorGuardado: mutation.error as Error | null,
    esNoAutorizado: [
      detalleQuery.error,
      fichaQuery.error,
      gpsQuery.error,
      escoltaQuery.error,
      mutation.error,
    ].some(esSesionInvalida),
    // Solo el detalle y la ficha bloquean la pantalla; GPS, escolta y guardado
    // dicen su falta de permiso en su propia sección.
    esProhibido: esProhibido(detalleQuery.error) || esProhibido(fichaQuery.error),
    guardando: mutation.isPending,
    reintentar: () => {
      void detalleQuery.refetch();
      void fichaQuery.refetch();
    },
    reintentarGps: () => void gpsQuery.refetch(),
    reintentarEscolta: () => void escoltaQuery.refetch(),
    guardar: (entrada) => mutation.mutateAsync(entrada),
  };
}
