/** Estado de frescura de una proyección del reporte. */
export type EstadoFrescura = 'atrasada' | 'sin_datos' | 'no_informada' | 'fresca';

/** Campos de frescura que entrega el reporte. `stale` ausente significa «no informada». */
export interface ProyeccionFrescura {
  readonly stale?: boolean;
  readonly proyeccion_al?: string | null;
}

/**
 * Clasifica la frescura de una proyección. Precedencia:
 * 1. `stale === true` → atrasada.
 * 2. `proyeccion_al` null o ausente → sin_datos.
 * 3. `stale` ausente → no_informada. Nunca se trata como fresca.
 * 4. `stale === false` → fresca.
 *
 * No usa umbral ni reloj: el techo de frescura es configuración del servicio.
 */
export function estadoFrescura(proyeccion: ProyeccionFrescura): EstadoFrescura {
  if (proyeccion.stale === true) return 'atrasada';
  if (proyeccion.proyeccion_al === null || proyeccion.proyeccion_al === undefined) {
    return 'sin_datos';
  }
  if (proyeccion.stale === undefined) return 'no_informada';
  return 'fresca';
}
