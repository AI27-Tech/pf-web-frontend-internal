import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import {
  agregarNotaEmergenciaInterno,
  cerrarEmergencia,
  listarEmergenciasViaje,
} from '@/lib/api/emergencias';
import type { EmergenciaViaje } from '@/lib/contracts/emergencias';

/**
 * Casos de emergencia de un viaje para el monitoreo: lista, nota y cierre.
 * El caso `cerrada` se oculta: no admite notas ni cierre (Req 3.8, 14).
 */
export function useEmergenciasViaje(viajeId: string) {
  const { sesion } = useSession();
  const token = sesion?.accessToken ?? '';
  const [casos, setCasos] = useState<EmergenciaViaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const recargar = useCallback(async () => {
    try {
      const pagina = await listarEmergenciasViaje(viajeId, token);
      setCasos(pagina.items.filter((c) => c.estado !== 'cerrada'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('No se pudieron cargar las emergencias'));
    } finally {
      setCargando(false);
    }
  }, [token, viajeId]);

  useEffect(() => {
    // La carga inicial sincroniza una fuente externa (BFF) con el estado local.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recargar();
  }, [recargar]);

  const agregarNota = useCallback(
    (eid: string, cuerpo: string) => agregarNotaEmergenciaInterno(viajeId, eid, { cuerpo }, token),
    [token, viajeId],
  );

  const cerrar = useCallback((eid: string) => cerrarEmergencia(eid, token), [token]);

  return { casos, cargando, error, recargar, agregarNota, cerrar };
}
