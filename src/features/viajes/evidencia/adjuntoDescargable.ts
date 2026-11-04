import type { EstadoEscaneo } from '@/lib/contracts/adjuntos';

/**
 * Un adjunto ofrece descarga solo si su escaneo concluyó `limpio`. Es la regla del contrato
 * (`estado_escaneo`: «un adjunto no limpio no autoriza descarga»).
 *
 * SUJETA A LA PREGUNTA ABIERTA 10: con el backend de V1 todo adjunto queda `pendiente`
 * porque no hay escáner. Si Producto decide otro tratamiento de `pendiente`, esta función
 * es el único punto que cambia.
 */
export function esDescargable(estadoEscaneo: EstadoEscaneo): boolean {
  return estadoEscaneo === 'limpio';
}
