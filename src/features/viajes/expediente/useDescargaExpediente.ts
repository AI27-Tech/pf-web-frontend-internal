import { useCallback, useRef } from 'react';

import { useMutation } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import { ApiError } from '@/lib/api/errors';
import {
  descargarViaje,
  ErrorDescargaProhibida,
  ErrorViajeInexistente,
} from '@/lib/api/expediente';

import {
  entregarArchivo,
  nombreProvisionalExpediente,
  serializarExpediente,
} from './entregarArchivo';

export interface DescargaExpedienteHook {
  readonly descargar: () => void;
  readonly preparando: boolean;
  readonly exito: boolean;
  readonly error: Error | null;
  readonly esProhibido: boolean;
  readonly esNoEncontrado: boolean;
  readonly esSesionFinalizada: boolean;
  readonly esErrorRecuperable: boolean;
}

/**
 * Descarga del expediente de un viaje. Una pulsación equivale a una solicitud:
 * la ref se marca de forma síncrona antes de `mutate`, así que un doble clic no
 * llega a disparar una segunda petición.
 *
 * `retry: false` es explícito: reintentar duplicaría la auditoría de `operacion`.
 * El hook no escribe ni simula auditoría.
 */
export function useDescargaExpediente(viajeId: string): DescargaExpedienteHook {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  const enCurso = useRef(false);

  const mutacion = useMutation({
    mutationFn: () => descargarViaje(viajeId, accessToken),
    retry: false,
    onSuccess: (payload) => {
      entregarArchivo(serializarExpediente(payload), nombreProvisionalExpediente(viajeId));
    },
    onSettled: () => {
      enCurso.current = false;
    },
  });

  const { mutate } = mutacion;
  const descargar = useCallback(() => {
    if (enCurso.current) return;
    enCurso.current = true;
    mutate();
  }, [mutate]);

  const error = mutacion.error ?? null;
  const esProhibido = error instanceof ErrorDescargaProhibida;
  const esNoEncontrado = error instanceof ErrorViajeInexistente;
  const esSesionFinalizada = error instanceof ApiError && error.kind === 'sesionFinalizada';

  return {
    descargar,
    preparando: mutacion.isPending,
    exito: mutacion.isSuccess,
    error,
    esProhibido,
    esNoEncontrado,
    esSesionFinalizada,
    esErrorRecuperable: error !== null && !esProhibido && !esNoEncontrado && !esSesionFinalizada,
  };
}
