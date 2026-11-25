/*
 * Mapeo de la arista de la máquina de estados a la capacidad que la ejerce.
 *
 * Las aristas salen de `TRANSICIONES_VIAJE` (generado). Aquí solo se decide qué
 * capacidad corresponde a cada destino. Las llaves son los valores del enum como
 * cadenas para no romper la compilación cuando un tracer retire un estado.
 *
 * `null` significa que el panel interno no ofrece el destino: lo dispara el
 * cliente (`disparador: cliente`) o es inalcanzable en V1.
 */
import type { Capacidad } from './capacidades';

const CAPACIDAD_POR_DESTINO: Readonly<Record<string, Capacidad | null>> = {
  ASIGNADO: 'viaje.asignarEscolta',
  APTO_PARA_SALIDA: 'viaje.marcarApto',
  EN_EMBARQUE: 'viaje.avanzar',
  EN_TRANSITO: 'viaje.avanzar',
  EN_DESTINO: 'viaje.avanzar',
  EN_DESCARGA: 'viaje.avanzar',
  CERRADO: 'viaje.cerrar',
  // Lo dispara el cliente (disparador: cliente).
  CANCELADO_POR_CLIENTE: null,
  // Inalcanzable en V1.
  PATRULLA_EN_CAMINO: null,
};

/** `undefined`: destino sin mapear (la prueba de transiciones lo reporta). `null`: no se ofrece. */
export function capacidadDeTransicion(destino: string): Capacidad | null | undefined {
  return CAPACIDAD_POR_DESTINO[destino];
}
