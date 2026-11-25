import type { Rol } from '@ai27-tech/contracts/roles';
import { puede } from '@/lib/permisos';

/**
 * Indica si la sesión puede mostrar el gesto de resolver o corregir una
 * incidencia: supervisor, coordinador y administrador (decisión del Lead 6).
 */
export function puedeCorregirIncidencia(rol: Rol): boolean {
  return puede(rol, 'viaje.incidencia.resolver');
}

/** Alias semántico para consumidores que modelan la visibilidad como predicado. */
export const esVisibleCorreccion = puedeCorregirIncidencia;
