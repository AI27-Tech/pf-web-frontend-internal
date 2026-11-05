import { useCallback, useRef, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { activarEmergenciaInterno, ErrorViajeTerminal } from '@/lib/api/emergencias';
import { ApiError } from '@/lib/api/errors';
import type { EmergenciaViaje } from '@/lib/contracts/emergencias';

/** Genera la clave de idempotencia de una pulsación intencional. */
function nuevaActivacionId(): string {
  return crypto.randomUUID();
}

interface OpcionesActivacion {
  /** Activación confirmada (201 nueva o 200 reentrega). */
  onActivada: (caso: EmergenciaViaje) => void;
  /** El viaje ya es terminal (409): el padre recarga el detalle. */
  onViajeTerminal: () => void;
}

/**
 * Activación de emergencia desde el viaje (DEC-135).
 *
 * El `activacion_id` se genera por pulsación y se reutiliza en cada reintento hasta
 * una respuesta confirmada: éxito (201 o 200) o rechazo definitivo (4xx). Un fallo de
 * red o 5xx deja el id pendiente, para que el reintento sea idempotente. Un bloqueo
 * síncrono impide dos envíos en vuelo.
 */
export function useActivarEmergencia(viajeId: string, opciones: OpcionesActivacion) {
  const { sesion } = useSession();
  const token = sesion?.accessToken ?? '';
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Id de la pulsación pendiente de confirmar. Null tras una confirmación o rechazo definitivo.
  const pendiente = useRef<string | null>(null);
  const bloqueo = useRef(false);

  const activar = useCallback(async () => {
    if (bloqueo.current) return;
    if (pendiente.current === null) pendiente.current = nuevaActivacionId();
    bloqueo.current = true;
    setEnCurso(true);
    setError(null);
    try {
      const caso = await activarEmergenciaInterno(
        viajeId,
        { activacion_id: pendiente.current },
        token,
      );
      pendiente.current = null;
      opciones.onActivada(caso);
    } catch (e) {
      if (e instanceof ApiError && e.status !== undefined && e.status >= 400 && e.status < 500) {
        pendiente.current = null;
      }
      if (e instanceof ErrorViajeTerminal) opciones.onViajeTerminal();
      setError(e instanceof Error ? e : new Error('No se pudo activar la emergencia'));
    } finally {
      bloqueo.current = false;
      setEnCurso(false);
    }
  }, [opciones, token, viajeId]);

  return { activar, enCurso, error };
}
