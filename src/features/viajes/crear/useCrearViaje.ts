/* Hook de datos y mutación única de creación por Operación (E8-T11). */

import { useMutation, useQuery } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import { listarTodosClientes } from '@/lib/api/clientes';
import { listarUnidades } from '@/lib/api/unidades';
import type { Cliente } from '@/lib/contracts/clientes';

import {
  ejecutarCreacion,
  type DatosCrearViaje,
  type ResultadoCrearViaje,
} from './adaptadorCrearViaje';

export interface CrearViajeHook {
  readonly clientes: Cliente[];
  readonly cargandoClientes: boolean;
  readonly errorClientes: Error | null;
  readonly reintentarClientes: () => void;
  readonly unidades: ReturnType<typeof useRosterData>['unidades'];
  readonly cargandoUnidades: boolean;
  readonly errorUnidades: Error | null;
  readonly reintentarUnidades: () => void;
  readonly enviando: boolean;
  readonly crear: (datos: DatosCrearViaje) => Promise<ResultadoCrearViaje>;
}

function useClientesData(accessToken: string, habilitado: boolean) {
  const query = useQuery({
    queryKey: ['clientes'],
    queryFn: () => listarTodosClientes(accessToken),
    enabled: habilitado && accessToken.length > 0,
    retry: false,
  });

  return {
    clientes: query.data ?? [],
    cargandoClientes: habilitado && query.isPending,
    errorClientes: query.isError ? (query.error as Error) : null,
    reintentarClientes: () => void query.refetch(),
  };
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
  const clientes = useClientesData(accessToken, habilitado);
  const mutation = useMutation({
    mutationFn: (datos: DatosCrearViaje) => ejecutarCreacion(datos, accessToken),
    retry: false,
  });

  return {
    ...clientes,
    ...roster,
    enviando: mutation.isPending,
    crear: (datos) => mutation.mutateAsync(datos),
  };
}
