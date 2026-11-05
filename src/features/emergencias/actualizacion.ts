import { EMERGENCIAS_POLLING_MS } from '@/lib/constants';

/**
 * Fuente de actualización de la vista. Hoy se implementa por polling (DT-01).
 * Un transporte de empuje (SSE) reemplazaría esta implementación sin tocar las vistas.
 */
export interface FuenteActualizacion {
  iniciar(): void;
  detener(): void;
}

/**
 * Polling con una sola consulta en vuelo. Si una consulta tarda más que el intervalo,
 * el ciclo siguiente se omite en vez de encolarse.
 */
export function crearPollingEmergencias(
  consultar: () => void | Promise<void>,
  intervaloMs: number = EMERGENCIAS_POLLING_MS,
): FuenteActualizacion {
  let timer: ReturnType<typeof setInterval> | undefined;
  let enVuelo = false;
  const ejecutar = async () => {
    if (enVuelo) return;
    enVuelo = true;
    try {
      await consultar();
    } finally {
      enVuelo = false;
    }
  };
  return {
    iniciar() {
      if (!timer) timer = setInterval(() => void ejecutar(), intervaloMs);
    },
    detener() {
      if (timer) clearInterval(timer);
      timer = undefined;
      enVuelo = false;
    },
  };
}
