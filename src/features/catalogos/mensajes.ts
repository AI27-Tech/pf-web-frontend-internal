/*
 * Texto de los errores del servidor al escribir vehículos y custodios. La UI decide
 * por `status` y `kind`, no por el `mensaje` del `bff` (que no es contrato de UI).
 */

import { ApiError } from '@/lib/api/errors';
import type { Vehiculo } from '@/lib/contracts/catalogos';

export type RecursoCatalogo = 'vehiculo' | 'custodio';

const NOMBRE: Record<RecursoCatalogo, string> = { vehiculo: 'vehículo', custodio: 'custodio' };
const PLURAL: Record<RecursoCatalogo, string> = { vehiculo: 'vehículos', custodio: 'custodios' };

export function mensajeErrorCatalogo(error: unknown, recurso: RecursoCatalogo): string {
  const nombre = NOMBRE[recurso];
  if (!(error instanceof ApiError)) return `No se pudo guardar el ${nombre}.`;
  // 400 se revisa por status: `kindFromStatus` no tiene una clase propia para él.
  if (error.status === 400)
    return `El servicio rechazó los datos del ${nombre}. Revisa la captura.`;
  switch (error.kind) {
    case 'prohibido':
      return `No tienes permiso para dar de alta o editar ${PLURAL[recurso]}. Solo el Administrador puede hacerlo.`;
    case 'noEncontrado':
      return `El ${nombre} ya no existe. Recarga la lista.`;
    case 'conflicto':
      return `El ${nombre} cambió en otra operación. Recarga e intenta de nuevo.`;
    case 'degradado':
      return 'El servicio no está disponible. Reintenta más tarde.';
    case 'red':
      return 'No se pudo conectar con el servicio. Revisa la conexión.';
    default:
      return `No se pudo guardar el ${nombre}.`;
  }
}

/** "P-101 · ABC-1234" para el selector y la tabla; el id si no hay económico ni placas. */
export function etiquetaVehiculo(vehiculo: Vehiculo): string {
  const partes = [vehiculo.economico, vehiculo.placas].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : vehiculo.id;
}
