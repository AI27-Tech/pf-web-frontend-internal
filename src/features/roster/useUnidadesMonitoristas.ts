/*
 * Estado de "mis unidades" de cada Monitorista en /roster (E8-T21, DEC-140 #1,
 * DEC-142 #2, DEC-145).
 *
 * Lee todos los Monitoristas activos con su alcance y el roster completo, porque
 * la tarjeta muestra cada unidad legible y el diálogo ofrece todas las activas.
 * Fijar reemplaza el conjunto completo y espera la recarga antes de terminar.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import {
  fijarUnidadesSujeto,
  listarMonitoristasActivos,
  obtenerAlcanceSujeto,
} from '@/lib/api/alcance';
import { listarPaginaUnidades } from '@/lib/api/unidades';
import type { UsuarioAdmin } from '@/lib/contracts/alcance';

export interface MonitoristaConUnidades {
  readonly monitorista: UsuarioAdmin;
  /** "Mis unidades": las asignadas directamente, no las efectivas por jerarquía. */
  readonly unidadesIds: readonly string[];
}

export interface FijadoUnidades {
  readonly sujetoId: string;
  readonly unidadesIds: readonly string[];
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

export function useUnidadesMonitoristas() {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  const queryClient = useQueryClient();
  const enabled = accessToken.length > 0;

  const monitoristas = useQuery({
    queryKey: ['alcance', 'monitoristas'],
    queryFn: async (): Promise<MonitoristaConUnidades[]> => {
      const usuarios = await todasLasPaginas((cursor) =>
        listarMonitoristasActivos(accessToken, cursor),
      );
      return Promise.all(
        usuarios.map(async (monitorista) => ({
          monitorista,
          unidadesIds: (await obtenerAlcanceSujeto(monitorista.id, accessToken)).unidades_ids,
        })),
      );
    },
    retry: false,
    enabled,
  });

  // Bajo ['unidades']: el alta o edición del roster también refresca esta lista.
  const unidades = useQuery({
    queryKey: ['unidades', 'todas'],
    queryFn: () => todasLasPaginas((cursor) => listarPaginaUnidades(accessToken, cursor)),
    retry: false,
    enabled,
  });

  const fijar = useMutation({
    mutationFn: ({ sujetoId, unidadesIds }: FijadoUnidades) =>
      fijarUnidadesSujeto(sujetoId, { unidades_ids: [...unidadesIds] }, accessToken),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alcance'] }),
  });

  return {
    monitoristas: monitoristas.data ?? [],
    unidades: unidades.data ?? [],
    cargando: monitoristas.isPending || unidades.isPending,
    error: monitoristas.error ?? unidades.error,
    reintentar: () => {
      if (monitoristas.error) void monitoristas.refetch();
      if (unidades.error) void unidades.refetch();
    },
    fijar,
  };
}
