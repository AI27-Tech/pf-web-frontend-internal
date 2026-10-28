/*
 * Estado de lectura de la ficha técnica (E8-T12).
 *
 * La ficha y el detalle son recursos distintos: el detalle aporta los datos
 * conocidos del viaje y la ficha aporta el expediente opcional. La vista no
 * inventa una ficha cuando el BFF responde 404.
 */

import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import { ApiError } from '@/lib/api/errors';
import { obtenerFicha } from '@/lib/api/fichaTecnica';
import { obtenerDetalle } from '@/lib/api/viajeDetalle';
import type { FichaTecnica } from '@/lib/contracts/fichaTecnica';
import type { ViajeDetalle } from '@/lib/contracts/viajeDetalle';

export interface FichaTecnicaHook {
  readonly detalle: ViajeDetalle | null;
  readonly ficha: FichaTecnica | null;
  readonly cargando: boolean;
  readonly fichaVacia: boolean;
  readonly error: Error | null;
  readonly esNoAutorizado: boolean;
  readonly reintentar: () => void;
}

export function useFichaTecnica(id: string): FichaTecnicaHook {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';

  const detalleQuery = useQuery({
    queryKey: ['viaje', id],
    queryFn: () => obtenerDetalle(id, accessToken),
    retry: false,
  });

  const fichaQuery = useQuery({
    queryKey: ['ficha', id],
    queryFn: () => obtenerFicha(id, accessToken),
    retry: false,
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
    cargando: detalleQuery.isPending || fichaQuery.isPending,
    fichaVacia,
    error,
    esNoAutorizado:
      (detalleQuery.error instanceof ApiError && detalleQuery.error.kind === 'noAutorizado') ||
      (fichaQuery.error instanceof ApiError && fichaQuery.error.kind === 'noAutorizado'),
    reintentar: () => {
      void detalleQuery.refetch();
      void fichaQuery.refetch();
    },
  };
}
