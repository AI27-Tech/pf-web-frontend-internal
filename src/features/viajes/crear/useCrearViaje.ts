/* Hook de datos y mutación única de creación por Operación (E8-T11). */

import { useMutation, useQuery } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import { listarUnidades } from '@/lib/api/unidades';

import {
  ejecutarCreacion,
  type DatosCrearViaje,
  type ResultadoCrearViaje,
} from './adaptadorCrearViaje';

export interface CrearViajeHook {
  readonly unidades: ReturnType<typeof useRosterData>['unidades'];
  readonly cargandoUnidades: boolean;
  readonly errorUnidades: Error | null;
  readonly reintentarUnidades: () => void;
  readonly enviando: boolean;
  readonly crear: (datos: DatosCrearViaje) => Promise<ResultadoCrearViaje>;
}

function useRosterData(accessToken: string, habilitado: boolean) {
  const query = useQuery({
    queryKey: ['unidades'],
    queryFn: () => listarUnidades(accessToken),
    enabled: habilitado && accessToken.length > 0,
    retry: false,
  });

  return {
    unidades: query.data ?? [],
    cargandoUnidades: habilitado && query.isPending,
    errorUnidades: query.isError ? (query.error as Error) : null,
    reintentarUnidades: () => void query.refetch(),
  };
}

export function useCrearViaje(habilitado = true): CrearViajeHook {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  const roster = useRosterData(accessToken, habilitado);
  const mutation = useMutation({
    mutationFn: (datos: DatosCrearViaje) => ejecutarCreacion(datos, accessToken),
    retry: false,
  });

  return {
    ...roster,
    enviando: mutation.isPending,
    crear: (datos) => mutation.mutateAsync(datos),
  };
}
