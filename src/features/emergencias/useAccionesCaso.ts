import { useCallback, useRef, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import {
  cerrarEmergencia,
  liberarReclamoEmergencia,
  reclamarEmergencia,
  resolverEmergencia,
} from '@/lib/api/emergencias';
import { ApiError } from '@/lib/api/errors';
import type { EmergenciaReaccion } from '@/lib/contracts/emergencias';
import { esNotaValida, normalizarNota } from './nota';

export type AccionCaso = 'reclamar' | 'devolver' | 'resolver' | 'cerrar';

/**
 * Acciones sobre un caso. Cada una envía la versión que corresponde:
 * reclamar usa `caso.version_reclamo`; devolver y resolver usan la versión del `reclamo_activo`.
 * Un bloqueo impide el doble envío. Un 403 o 409 no se reintenta: el caller recarga.
 */
export function useAccionesCaso(caso: EmergenciaReaccion | null, onAplicada: () => void) {
  const { sesion } = useSession();
  const token = sesion?.accessToken ?? '';
  const [enCurso, setEnCurso] = useState<AccionCaso | null>(null);
  const [error, setError] = useState<Error | null>(null);
  // Bloqueo síncrono: evita dos envíos aunque se dispare antes de que React re-renderice.
  const bloqueo = useRef(false);

  const ejecutar = useCallback(
    async (accion: AccionCaso, operacion: () => Promise<unknown>) => {
      if (bloqueo.current) return false;
      bloqueo.current = true;
      setEnCurso(accion);
      setError(null);
      try {
        await operacion();
        onAplicada();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e : new Error('No se pudo completar la acción'));
        // 403 y 409 significan que el caso cambió o no es nuestro: recargar la vista.
        if (e instanceof ApiError && (e.status === 403 || e.status === 409)) onAplicada();
        return false;
      } finally {
        bloqueo.current = false;
        setEnCurso(null);
      }
    },
    [onAplicada],
  );

  const reclamar = useCallback(() => {
    if (!caso) return Promise.resolve(false);
    return ejecutar('reclamar', () =>
      reclamarEmergencia(caso.id, { version_esperada: caso.version_reclamo }, token),
    );
  }, [caso, ejecutar, token]);

  const devolver = useCallback(() => {
    const reclamo = caso?.reclamo_activo;
    if (!caso || !reclamo) return Promise.resolve(false);
    return ejecutar('devolver', () =>
      liberarReclamoEmergencia(caso.id, reclamo.id, reclamo.version, token),
    );
  }, [caso, ejecutar, token]);

  const resolver = useCallback(
    (texto: string) => {
      const reclamo = caso?.reclamo_activo;
      if (!caso || !reclamo || !esNotaValida(texto)) return Promise.resolve(false);
      return ejecutar('resolver', () =>
        resolverEmergencia(
          caso.id,
          { version_esperada: reclamo.version, nota: normalizarNota(texto) },
          token,
        ),
      );
    },
    [caso, ejecutar, token],
  );

  const cerrar = useCallback(() => {
    if (!caso) return Promise.resolve(false);
    return ejecutar('cerrar', () => cerrarEmergencia(caso.id, token));
  }, [caso, ejecutar, token]);

  return { reclamar, devolver, resolver, cerrar, enCurso, error };
}
