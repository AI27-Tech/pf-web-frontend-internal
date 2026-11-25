/*
 * Destinos posibles de una transferencia de conversación de solicitud: usuarios activos de
 * `cotizacion` (`listarSujetos`, solo `administrador`). Sin reintento: un `403` es la respuesta,
 * no un fallo pasajero. Solo consulta cuando el diálogo está abierto.
 */
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/context/SessionContext';
import { listarTodosUsuariosCotizacion } from '@/lib/api/usuarios';

export function useDestinosTransferencia(habilitado: boolean) {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  return useQuery({
    queryKey: ['conversaciones', 'destinos-transferencia', 'cotizacion'],
    queryFn: () => listarTodosUsuariosCotizacion(accessToken),
    retry: false,
    enabled: habilitado && accessToken.length > 0,
  });
}
