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

/** El `bff` no publica su tamaño de página: solo posiciona el control de páginas. */
const TAMANO_PAGINA = 20;

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
  const unidades = pagina.data?.items ?? [];
  const numeroPagina = cursores.length + 1;

  const siguiente = () => {
    if (cursorSiguiente !== null) setCursores((actual) => [...actual, cursorSiguiente]);
  };

  return {
    unidades,
    cargando: pagina.isPending,
    error: pagina.error,
    reintentar: () => void pagina.refetch(),
    numeroPagina,
    haySiguiente: cursorSiguiente !== null,
    hayAnterior: cursores.length > 0,
    siguiente,
    anterior: () => setCursores((actual) => actual.slice(0, -1)),
    /** Solo avanza o retrocede una página: el cursor no permite saltar. */
    irAPagina: (numero: number) => {
      if (numero < numeroPagina) setCursores((actual) => actual.slice(0, numero - 1));
      else if (numero === numeroPagina + 1) siguiente();
    },
    /**
     * Total aproximado para el control de páginas, porque el `bff` no publica el total. Si hay
     * más páginas, deja una página adicional visible.
     */
    totalEstimado:
      cursorSiguiente !== null
        ? numeroPagina * TAMANO_PAGINA + 1
        : (numeroPagina - 1) * TAMANO_PAGINA + unidades.length,
    guardar,
  };
}
