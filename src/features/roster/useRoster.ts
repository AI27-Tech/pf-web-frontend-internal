/*
 * Estado del roster (E8-T21): la página actual por cursor y el alta o edición.
 *
 * El `bff` pagina por cursor opaco sin total, así que la navegación es anterior y
 * siguiente con una pila de cursores visitados. Guardar invalida ['unidades'], que
 * también refresca el selector de "Asignar escolta" del detalle del viaje.
 */

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import { crearUnidad, listarPaginaUnidades, modificarUnidad } from '@/lib/api/unidades';
import type { UnidadEntrada, UnidadModificacion } from '@/lib/contracts/unidades';

export type GuardadoUnidad =
  | { readonly id: string; readonly cambios: UnidadModificacion }
  | { readonly entrada: UnidadEntrada };

export function useRoster() {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  const queryClient = useQueryClient();
  // cursores[i] pide la página i + 2; la primera página no lleva cursor.
  const [cursores, setCursores] = useState<readonly string[]>([]);
  const cursor = cursores.at(-1);

  const pagina = useQuery({
    queryKey: ['unidades', 'pagina', cursor ?? null],
    queryFn: () => listarPaginaUnidades(accessToken, cursor),
    retry: false,
    enabled: accessToken.length > 0,
  });

  const guardar = useMutation({
    mutationFn: (datos: GuardadoUnidad) =>
      'id' in datos
        ? modificarUnidad(datos.id, datos.cambios, accessToken)
        : crearUnidad(datos.entrada, accessToken),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['unidades'] });
    },
  });

  const cursorSiguiente = pagina.data?.cursor_siguiente ?? null;

  return {
    unidades: pagina.data?.items ?? [],
    cargando: pagina.isPending,
    error: pagina.error,
    reintentar: () => void pagina.refetch(),
    numeroPagina: cursores.length + 1,
    haySiguiente: cursorSiguiente !== null,
    hayAnterior: cursores.length > 0,
    siguiente: () => {
      if (cursorSiguiente !== null) setCursores((actual) => [...actual, cursorSiguiente]);
    },
    anterior: () => setCursores((actual) => actual.slice(0, -1)),
    guardar,
  };
}
