/*
 * Opciones del selector de unidades para el alcance de monitoreo (E8-T19, R6.1).
 *
 * Desde tracer.38 (DT-19) el `bff` agrega el vehículo y los custodios legibles a
 * cada unidad (B-16). La etiqueta es el económico y las placas del vehículo, y el
 * detalle son los nombres de los custodios. Si el catálogo ya no tiene alguno, se
 * muestra su identificador; no se inventa nombre ni placa.
 */

import type { Unidad } from '@/lib/contracts/administracion';
import { custodiosLegibles, vehiculoLegible } from '../viajes/unidadLegible';

export interface OpcionUnidad {
  readonly valor: string;
  readonly etiqueta: string;
  readonly detalle: string;
}

/** Una opción por unidad devuelta, en el orden recibido. */
export function opcionesUnidadesAlcance(unidades: readonly Unidad[]): readonly OpcionUnidad[] {
  return unidades.map((unidad) => ({
    valor: unidad.id,
    etiqueta: vehiculoLegible(unidad),
    detalle: custodiosLegibles(unidad),
  }));
}
