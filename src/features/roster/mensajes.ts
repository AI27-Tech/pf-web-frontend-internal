/*
 * Texto de los rechazos del servidor al armar el roster (DEC-142 #4 y #5). Se decide
 * por el `codigo` de máquina del 409 y por el `status`, nunca por el `mensaje`.
 */

import { ApiError } from '@/lib/api/errors';

const POR_CODIGO: Record<string, string> = {
  vehiculo_en_otra_unidad:
    'El vehículo ya está en otra unidad activa. Elige otro vehículo o desactiva primero esa unidad.',
  custodio_en_otra_unidad:
    'Un custodio elegido ya está en otra unidad activa. Elige otro custodio o desactiva primero esa unidad.',
  unidad_con_reserva_vigente:
    'La unidad está reservada en un viaje en curso. Primero reasigna la escolta de ese viaje y después edita o desactiva la unidad.',
};

export function mensajeErrorRoster(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No se pudo guardar la unidad.';
  const porCodigo = error.codigo ? POR_CODIGO[error.codigo] : undefined;
  if (porCodigo) return porCodigo;
  // 400 se revisa por status: `kindFromStatus` no tiene una clase propia para él.
  if (error.status === 400) {
    return 'El servicio rechazó la unidad: revisa que el vehículo y los custodios sigan activos y que la cantidad de custodios corresponda al vehículo.';
  }
  switch (error.kind) {
    case 'prohibido':
      return 'No tienes permiso para armar el roster.';
    case 'noEncontrado':
      return 'La unidad ya no existe. Recarga el roster.';
    case 'conflicto':
      return 'El roster cambió en otra operación. Recarga e intenta de nuevo.';
    case 'degradado':
      return 'El servicio no está disponible. Reintenta más tarde.';
    case 'red':
      return 'No se pudo conectar con el servicio. Revisa la conexión.';
    default:
      return 'No se pudo guardar la unidad.';
  }
}
