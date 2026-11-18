/*
 * Texto de los rechazos del servidor al armar el roster (DEC-142 #4 y #5) y al fijar
 * las unidades de cada Monitorista (DEC-140 #1). Se decide
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

const POR_CODIGO_ALCANCE: Record<string, string> = {
  rol_sin_alcance:
    'El usuario ya no es Monitorista y no puede tener unidades asignadas. Recarga la lista.',
  sujeto_desactivado: 'El Monitorista está desactivado. Recarga la lista.',
  autoescalamiento: 'No puedes cambiar tu propio alcance.',
};

/** Texto de los rechazos al fijar "mis unidades" de un Monitorista (DEC-140 #1). */
export function mensajeErrorAlcance(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No se pudieron guardar las unidades.';
  const porCodigo = error.codigo ? POR_CODIGO_ALCANCE[error.codigo] : undefined;
  if (porCodigo) return porCodigo;
  if (error.status === 400) {
    return 'Alguna unidad elegida ya no existe en el roster. Recarga e intenta de nuevo.';
  }
  switch (error.kind) {
    case 'prohibido':
      return 'No tienes permiso para asignar unidades a los Monitoristas.';
    case 'noEncontrado':
      return 'El Monitorista ya no existe. Recarga la lista.';
    case 'conflicto':
      return 'Las unidades del Monitorista cambiaron en otra operación. Recarga e intenta de nuevo.';
    case 'degradado':
      return 'El servicio no está disponible. Reintenta más tarde.';
    case 'red':
      return 'No se pudo conectar con el servicio. Revisa la conexión.';
    default:
      return 'No se pudieron guardar las unidades.';
  }
}
