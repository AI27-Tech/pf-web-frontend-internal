/**
 * Guard de la decisión sobre una solicitud (E8-T9).
 *
 * Módulo puro. Concentra la regla de negocio "no se puede aprobar una solicitud
 * sin la fecha/hora del servicio" (E1-HU-003): la aprobación es explícita y la
 * `fecha_hora_servicio` es su guarda obligatoria.
 *
 * Es el único punto donde vive este predicado; la presentación lo consume para
 * decidir si habilita la acción Aprobar.
 */

import { EstadoViaje } from '@/lib/contracts/viajeDetalle';
import type { ViajeInterno } from '@/lib/contracts/viajeDetalle';

/**
 * Indica si la solicitud puede aprobarse.
 *
 * Es verdadero si y solo si:
 * 1. El viaje está en `SOLICITADO` (la decisión solo aplica ahí), y
 * 2. tiene `fecha_hora_servicio` presente (no nula ni vacía).
 *
 * @param viaje Viaje interno con estado canónico y `fecha_hora_servicio`.
 * @returns `true` si Aprobar debe habilitarse; `false` en otro caso.
 */
export function puedeAprobar(viaje: ViajeInterno): boolean {
  if (viaje.estado !== EstadoViaje.Solicitado) {
    return false;
  }
  return tieneFechaHora(viaje);
}

/**
 * Indica si el viaje tiene una `fecha_hora_servicio` utilizable (no nula ni
 * cadena vacía/espacios).
 *
 * @param viaje Viaje interno a inspeccionar.
 * @returns `true` si hay fecha/hora capturada.
 */
export function tieneFechaHora(viaje: ViajeInterno): boolean {
  const valor = viaje.fecha_hora_servicio;
  return typeof valor === 'string' && valor.trim().length > 0;
}
