import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/context/SessionContext';
import {
  agregarNotaEmergenciaInterno,
  cerrarEmergencia,
  listarEmergenciasViaje,
} from '@/lib/api/emergencias';
import type { EmergenciaViaje } from '@/lib/contracts/emergencias';

export interface OpcionesEmergenciasViaje {
  /** Falso para roles sin carril: el bff responde 403 a la lista, así que no se pide. */
  readonly habilitado?: boolean;
}

/**
 * Casos de emergencia de un viaje para el monitoreo: lista, nota y cierre.
 * El caso `cerrada` se oculta: no admite notas ni cierre (Req 3.8, 14).
 */
export function useEmergenciasViaje(viajeId: string, opciones: OpcionesEmergenciasViaje = {}) {
  const { habilitado = true } = opciones;
  const { sesion } = useSession();
  const token = sesion?.accessToken ?? '';
  const [casos, setCasos] = useState<EmergenciaViaje[]>([]);
  const [cargando, setCargando] = useState(habilitado);
  const [error, setError] = useState<Error | null>(null);

  const recargar = useCallback(async () => {
    if (!habilitado) return;
    try {
      const pagina = await listarEmergenciasViaje(viajeId, token);
      setCasos(pagina.items.filter((c) => c.estado !== 'cerrada'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('No se pudieron cargar las emergencias'));
    } finally {
      setCargando(false);
    }
  }, [habilitado, token, viajeId]);

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

/** Forma que devuelve el hook; el carril la recibe desde el detalle del viaje. */
export type EmergenciasViaje = ReturnType<typeof useEmergenciasViaje>;
