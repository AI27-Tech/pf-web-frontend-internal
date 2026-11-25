/*
 * Estado de "mis clientes" de cada Monitorista en /roster (DEC-149 #18, M11).
 *
 * Lee todos los Monitoristas activos con su alcance (`clientes_ids`) y el catálogo de clientes
 * activos que ofrece `listarClientes`. Un cliente asignado que ya no está entre los activos es
 * un cliente desactivado: se muestra por su id y no se vuelve a enviar. Fijar reemplaza el
 * conjunto completo y espera la recarga antes de terminar.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/context/SessionContext';
import {
  fijarClientesSujeto,
  listarMonitoristasActivos,
  obtenerAlcanceSujeto,
} from '@/lib/api/alcance';
import { listarTodosClientes } from '@/lib/api/clientes';
import { ApiError } from '@/lib/api/errors';
import type { UsuarioAdmin } from '@/lib/contracts/alcance';

export interface MonitoristaConClientes {
  readonly monitorista: UsuarioAdmin;
  /** "Mis clientes": los asignados directamente, no los efectivos por jerarquía. */
  readonly clientesIds: readonly string[];
}

export interface FijadoClientes {
  readonly sujetoId: string;
  readonly clientesIds: readonly string[];
}

/** Recorre un listado paginado por cursor hasta el final. */
export async function todasLasPaginas<T>(
  pedir: (cursor?: string) => Promise<{ items: T[]; cursor_siguiente?: string | null }>,
): Promise<T[]> {
  const items: T[] = [];
  const vistos = new Set<string>();
  let cursor: string | undefined;
  do {
    const pagina = await pedir(cursor);
    items.push(...pagina.items);
    cursor = pagina.cursor_siguiente ?? undefined;
    // Un cursor repetido cortaría en un ciclo infinito: se detiene ahí.
    if (cursor !== undefined && vistos.has(cursor)) break;
    if (cursor !== undefined) vistos.add(cursor);
  } while (cursor !== undefined);
  return items;
}

const CLAVE_CLIENTES_ACTIVOS = ['clientes', 'activos'] as const;

/** Catálogo de clientes activos (`listarClientes`); lo comparten la tarjeta y el alta de unidad. */
export function useClientesActivos(habilitado: boolean) {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  return useQuery({
    queryKey: CLAVE_CLIENTES_ACTIVOS,
    queryFn: () => listarTodosClientes(accessToken),
    retry: false,
    enabled: habilitado && accessToken.length > 0,
  });
}

export function useClientesMonitoristas() {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  const queryClient = useQueryClient();
  const enabled = accessToken.length > 0;

  const monitoristas = useQuery({
    queryKey: ['alcance', 'monitoristas'],
    queryFn: async (): Promise<MonitoristaConClientes[]> => {
      const usuarios = await todasLasPaginas((cursor) =>
        listarMonitoristasActivos(accessToken, cursor),
      );
      return Promise.all(
        usuarios.map(async (monitorista) => ({
          monitorista,
          clientesIds: (await obtenerAlcanceSujeto(monitorista.id, accessToken)).clientes_ids,
        })),
      );
    },
    retry: false,
    enabled,
  });

  // El BFF ya entrega solo clientes activos; lo que no esté aquí está desactivado.
  const clientes = useClientesActivos(true);

  const fijar = useMutation({
    mutationFn: ({ sujetoId, clientesIds }: FijadoClientes) =>
      fijarClientesSujeto(sujetoId, { clientes_ids: [...clientesIds] }, accessToken),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alcance'] }),
    onError: (error) => {
      // 400: un cliente no existe o está desactivado. La lista de activos pudo cambiar.
      if (error instanceof ApiError && error.status === 400) {
        void queryClient.invalidateQueries({ queryKey: CLAVE_CLIENTES_ACTIVOS });
      }
    },
  });

  return {
    monitoristas: monitoristas.data ?? [],
    clientes: clientes.data ?? [],
    cargando: monitoristas.isPending || clientes.isPending,
    error: monitoristas.error ?? clientes.error,
    reintentar: () => {
      if (monitoristas.error) void monitoristas.refetch();
      if (clientes.error) void clientes.refetch();
    },
    fijar,
  };
}
