import { CONVERSACIONES_POLLING_MS } from '@/lib/constants';

export interface FuenteActualizacion {
  iniciar(): void;
  detener(): void;
}
export function crearPolling(
  consultar: () => void | Promise<void>,
  intervaloMs = CONVERSACIONES_POLLING_MS,
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
