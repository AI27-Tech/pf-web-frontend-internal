/*
 * Opciones del selector de unidades para el alcance de monitoreo (E8-T19, R6.1).
 *
 * La etiqueta es el identificador que devuelve el `bff`. No se inventan nombre
 * ni placa: el `bff` no los expone en el roster (B-16).
 */

import type { Unidad } from '@/lib/contracts/administracion';

export interface OpcionUnidad {
  readonly valor: string;
  readonly etiqueta: string;
}

/** Una opción por unidad devuelta, en el orden recibido. */
export function opcionesUnidadesAlcance(unidades: readonly Unidad[]): readonly OpcionUnidad[] {
  return unidades.map((unidad) => ({ valor: unidad.id, etiqueta: unidad.id }));
}
