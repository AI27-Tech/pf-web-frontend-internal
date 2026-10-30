import { useCallback } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import { ApiError } from '@/lib/api/errors';
import {
  abrirIncidencia,
  abrirEstadia,
  cerrarEstadia,
  listarBitacora,
  listarEstadias,
  listarIncidencias,
  registrarEntradaBitacora,
  resolverIncidencia,
} from '@/lib/api/historicoViaje';
import type {
  EntradaBitacoraEntrada,
  EstadiaEntrada,
  IncidenciaEntrada,
  PaginaBitacora,
  PaginaEstadias,
  PaginaIncidencias,
  ResolucionIncidenciaEntrada,
} from '@/lib/contracts/historicoViaje';

const historicoKey = (id: string) => ['viaje', id, 'historico'] as const;
const bitacoraKey = (id: string) => [...historicoKey(id), 'bitacora'] as const;
const incidenciasKey = (id: string) => [...historicoKey(id), 'incidencias'] as const;
const estadiasKey = (id: string) => [...historicoKey(id), 'estadias'] as const;

/** Estado plano de una lectura del histórico que consume la presentación. */
export interface HistoricoQueryState<T> {
  readonly datos: T | null;
  readonly cargando: boolean;
  readonly vacio: boolean;
  readonly error: Error | null;
  readonly esNoAutorizado: boolean;
  readonly reintentar: () => void;
}

export interface HistoricoViajeHook {
  readonly bitacora: HistoricoQueryState<PaginaBitacora>;
  readonly estadias: HistoricoQueryState<PaginaEstadias>;
  readonly incidencias: HistoricoQueryState<PaginaIncidencias>;
  readonly registrarNota: (entrada: EntradaBitacoraEntrada) => Promise<void>;
  readonly abrirIncidencia: (entrada: IncidenciaEntrada) => Promise<void>;
  readonly resolverIncidencia: (
    incidenciaId: string,
    entrada: ResolucionIncidenciaEntrada,
  ) => Promise<void>;
  readonly abrirEstadia: (entrada: EstadiaEntrada) => Promise<void>;
  readonly cerrarEstadia: (estadiaId: string) => Promise<void>;
  readonly registrandoNota: boolean;
  readonly abriendoIncidencia: boolean;
  readonly resolviendoIncidencia: boolean;
  readonly abriendoEstadia: boolean;
  readonly cerrandoEstadia: boolean;
  readonly errorMutacion: Error | null;
  readonly esNoAutorizado: boolean;
}

function esNoAutorizadoError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.kind === 'noAutorizado' || error.kind === 'sesionFinalizada')
  );
}

function toQueryState<T>(query: ReturnType<typeof useQuery<T, Error>>): HistoricoQueryState<T> {
  return {
    datos: query.data ?? null,
    cargando: query.isPending,
    vacio: query.isSuccess && query.data !== undefined,
    error: query.isError ? query.error : null,
    esNoAutorizado: esNoAutorizadoError(query.error),
    reintentar: () => void query.refetch(),
  };
}

export function useHistoricoViaje(id: string): HistoricoViajeHook {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  const queryClient = useQueryClient();

  const bitacoraQuery = useQuery({
    queryKey: bitacoraKey(id),
    queryFn: () => listarBitacora(id, accessToken),
    retry: false,
  });
  const incidenciasQuery = useQuery({
    queryKey: incidenciasKey(id),
    queryFn: () => listarIncidencias(id, accessToken),
    retry: false,
  });
  const estadiasQuery = useQuery({
    queryKey: estadiasKey(id),
    queryFn: () => listarEstadias(id, accessToken),
    retry: false,
  });

  const notaMutation = useMutation({
    mutationFn: (entrada: EntradaBitacoraEntrada) =>
      registrarEntradaBitacora(id, entrada, accessToken),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: bitacoraKey(id) }),
  });
  const incidenciaMutation = useMutation({
    mutationFn: (entrada: IncidenciaEntrada) => abrirIncidencia(id, entrada, accessToken),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: incidenciasKey(id) }),
  });
  const resolverMutation = useMutation({
    mutationFn: ({
      incidenciaId,
      entrada,
    }: {
      incidenciaId: string;
      entrada: ResolucionIncidenciaEntrada;
    }) => resolverIncidencia(id, incidenciaId, entrada, accessToken),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: incidenciasKey(id) }),
  });
  const estadiaMutation = useMutation({
    mutationFn: (entrada: EstadiaEntrada) => abrirEstadia(id, entrada, accessToken),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: estadiasKey(id) }),
  });
  const cierreMutation = useMutation({
    mutationFn: (estadiaId: string) => cerrarEstadia(id, estadiaId, accessToken),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: estadiasKey(id) }),
  });

  const registrarNota = useCallback(
    (entrada: EntradaBitacoraEntrada) => notaMutation.mutateAsync(entrada).then(() => undefined),
    [notaMutation],
  );
  const abrirIncidenciaHandler = useCallback(
    (entrada: IncidenciaEntrada) => incidenciaMutation.mutateAsync(entrada).then(() => undefined),
    [incidenciaMutation],
  );
  const resolverIncidenciaHandler = useCallback(
    (incidenciaId: string, entrada: ResolucionIncidenciaEntrada) =>
      resolverMutation.mutateAsync({ incidenciaId, entrada }).then(() => undefined),
    [resolverMutation],
  );
  const abrirEstadiaHandler = useCallback(
    (entrada: EstadiaEntrada) => estadiaMutation.mutateAsync(entrada).then(() => undefined),
    [estadiaMutation],
  );
  const cerrarEstadiaHandler = useCallback(
    (estadiaId: string) => cierreMutation.mutateAsync(estadiaId).then(() => undefined),
    [cierreMutation],
  );

  const errorMutacion =
    [
      notaMutation.error,
      incidenciaMutation.error,
      resolverMutation.error,
      estadiaMutation.error,
      cierreMutation.error,
    ].find((error): error is Error => error instanceof Error) ?? null;

  const esNoAutorizado = [
    bitacoraQuery.error,
    incidenciasQuery.error,
    estadiasQuery.error,
    errorMutacion,
  ].some(esNoAutorizadoError);

  return {
    bitacora: toQueryState(bitacoraQuery),
    estadias: toQueryState(estadiasQuery),
    incidencias: toQueryState(incidenciasQuery),
    registrarNota,
    abrirIncidencia: abrirIncidenciaHandler,
    resolverIncidencia: resolverIncidenciaHandler,
    abrirEstadia: abrirEstadiaHandler,
    cerrarEstadia: cerrarEstadiaHandler,
    registrandoNota: notaMutation.isPending,
    abriendoIncidencia: incidenciaMutation.isPending,
    resolviendoIncidencia: resolverMutation.isPending,
    abriendoEstadia: estadiaMutation.isPending,
    cerrandoEstadia: cierreMutation.isPending,
    errorMutacion,
    esNoAutorizado,
  };
}
