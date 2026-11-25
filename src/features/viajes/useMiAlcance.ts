/*
 * Alcance del propio usuario para distinguir "sin clientes asignados" de "sin viajes" (B-04).
 *
 * Solo se consulta cuando la lista de viajes llegó vacía y el rol tiene `alcance.leerPropio`
 * (monitorista, supervisor, coordinador). Con cualquier otro rol la petición no se emite.
 */
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/context/SessionContext';
import { obtenerMiAlcance } from '@/lib/api/alcance';

export function useMiAlcance(habilitado: boolean) {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  return useQuery({
    queryKey: ['mi-alcance'],
    queryFn: () => obtenerMiAlcance(accessToken),
    enabled: habilitado,
    retry: false,
  });
}
