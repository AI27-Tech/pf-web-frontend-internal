import type { Adjunto } from '@/lib/contracts/adjuntos';

/**
 * Intervalo de sondeo mientras haya escaneo pendiente. Valor de trabajo, configurable y
 * pendiente de confirmar; no es un dato del contrato.
 */
export const INTERVALO_SONDEO_ESCANEO_MS = 5_000;

/**
 * Verdadero si hay al menos un adjunto `pendiente`. Con 0 pendientes, incluida la lista
 * vacía, el sondeo se detiene.
 *
 * SUJETA A LA PREGUNTA ABIERTA 10: con `pendiente` permanente (backend de V1) este sondeo
 * no se detendría nunca. El criterio de parada lo define Producto.
 */
export function hayEscaneoPendiente(items: readonly Pick<Adjunto, 'estado_escaneo'>[]): boolean {
  return items.some((adjunto) => adjunto.estado_escaneo === 'pendiente');
}
