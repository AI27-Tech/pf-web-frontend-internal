/*
 * Contexto de la activación de emergencia de un viaje.
 *
 * El botón de activar vive en el encabezado compartido de la ruta del viaje y el
 * carril de emergencias vive en la pestaña Detalle. Este contexto lleva el último
 * caso activado desde el encabezado hasta el carril, para que lo seleccione.
 */
import { createContext, useContext } from 'react';
import type { EmergenciaViaje } from '@/lib/contracts/emergencias';

export interface ActivacionEmergencia {
  /** Último caso activado desde el encabezado, o null si no hubo activación. */
  readonly casoActivado: EmergenciaViaje | null;
}

export const ActivacionEmergenciaContext = createContext<ActivacionEmergencia>({
  casoActivado: null,
});

export function useActivacionEmergencia(): ActivacionEmergencia {
  return useContext(ActivacionEmergenciaContext);
}
