/*
 * Estado de lectura, catálogo y guardado de la ficha técnica (E8-T12).
 *
 * La ficha y el detalle son recursos distintos. La mutación actualiza la ficha
 * únicamente con la respuesta confirmada por el BFF.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import { ApiError } from '@/lib/api/errors';
import { guardarFicha, listarGps, obtenerFicha } from '@/lib/api/fichaTecnica';
import { listarUnidades } from '@/lib/api/unidades';
import { obtenerDetalle } from '@/lib/api/viajeDetalle';
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
  readonly esNoAutorizado: boolean;
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

  // Escolta en solo lectura: se deriva del roster (`listarUnidades`, E8-T10),
  // no se recaptura. La asignación por viaje es un POST (reserva), no una
  // lectura; la ficha muestra las unidades disponibles del roster.
  const escoltaQuery = useQuery({
    queryKey: ['unidades'],
    queryFn: () => listarUnidades(accessToken),
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
    esNoAutorizado:
      (detalleQuery.error instanceof ApiError && detalleQuery.error.kind === 'noAutorizado') ||
      (fichaQuery.error instanceof ApiError && fichaQuery.error.kind === 'noAutorizado') ||
      (gpsQuery.error instanceof ApiError && gpsQuery.error.kind === 'noAutorizado') ||
      (escoltaQuery.error instanceof ApiError && escoltaQuery.error.kind === 'noAutorizado') ||
      (mutation.error instanceof ApiError && mutation.error.kind === 'noAutorizado'),
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
