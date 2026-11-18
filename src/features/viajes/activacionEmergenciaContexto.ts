/*
 * Contexto de la activación de emergencia de un viaje.
 *
 * El botón de activar vive en el encabezado compartido de la ruta del viaje y el
 * carril de emergencias vive en la pestaña Detalle. Este contexto lleva el último
 * caso activado y el resultado de la activación desde el encabezado hasta el carril.
 * El carril muestra el aviso junto a sus propias alertas.
 */
import { createContext, useContext } from 'react';
import type { AvisoEmergencia } from '@/features/emergencias/activacion/AccionEmergencia';
import type { EmergenciaViaje } from '@/lib/contracts/emergencias';

export interface ActivacionEmergencia {
  /** Último caso activado desde el encabezado, o null si no hubo activación. */
  readonly casoActivado: EmergenciaViaje | null;
  /** Resultado de la última activación (éxito o error), o null si no hay aviso. */
  readonly aviso: AvisoEmergencia | null;
  /** Quita el aviso; lo llama el carril al cerrarlo. */
  readonly cerrarAviso: () => void;
}

export const ActivacionEmergenciaContext = createContext<ActivacionEmergencia>({
  casoActivado: null,
  aviso: null,
  cerrarAviso: () => {},
});

export function useActivacionEmergencia(): ActivacionEmergencia {
  return useContext(ActivacionEmergenciaContext);
}
