/**
 * Derivación de acciones de transición ofrecidas al operador.
 *
 * Módulo puro que expone la lógica de negocio para calcular qué estados
 * destino puede alcanzar el operador desde el estado actual del viaje.
 *
 * Restricciones de V1:
 * - PATRULLA_EN_CAMINO es inalcanzable (excluido de acciones)
 * - Estados terminales no ofrecen transiciones
 */

import { type EstadoViaje, TRANSICIONES_VIAJE, esTerminal } from '@/lib/contracts/viajeDetalle';
import { capacidadDeTransicion, puede } from '@/lib/permisos';

/**
 * Deriva los estados destino alcanzables desde un estado origen dado.
 *
 * Lógica:
 * 1. Si el estado actual es terminal, retorna vacío (sin transiciones)
 * 2. Filtra `TRANSICIONES_VIAJE` por origen = estado actual
 * 3. Extrae los destinos
 * 4. Excluye `PATRULLA_EN_CAMINO` (inalcanzable en V1)
 *
 * @param estado - Estado actual del viaje (`EstadoViaje`)
 * @returns Array de estados destino permitidos, vacío si es terminal o sin transiciones
 */
export function accionesDesde(estado: EstadoViaje): EstadoViaje[] {
  // Si el viaje está en un estado terminal, no hay transiciones permitidas
  if (esTerminal(estado)) {
    return [];
  }

  // Filtra las transiciones que comienzan en el estado actual
  const destinosPosibles = TRANSICIONES_VIAJE.filter(([desde]) => desde === estado).map(
    ([, hacia]) => hacia,
  );

  // Excluye PATRULLA_EN_CAMINO (inalcanzable en V1)
  return destinosPosibles.filter((destino) => destino !== 'PATRULLA_EN_CAMINO');
}

/**
 * Deja solo las transiciones que el rol puede ejercer (M4, Requirement 5.2 a 5.4).
 *
 * El estado decide qué aristas existen (`accionesDesde`); la política decide cuáles
 * ejerce el rol. Un destino sin capacidad (`null`: lo dispara el cliente o es
 * inalcanzable) o sin mapear (`undefined`) no se ofrece.
 */
export function accionesPermitidas(
  acciones: readonly EstadoViaje[],
  rol: string | null | undefined,
): EstadoViaje[] {
  return acciones.filter((destino) => {
    const capacidad = capacidadDeTransicion(destino);
    return capacidad ? puede(rol, capacidad) : false;
  });
}
