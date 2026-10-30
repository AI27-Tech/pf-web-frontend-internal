import { Rol, type Rol as RolTipo } from '@ai27-tech/contracts/roles';

/** Roles con facultad de resolver incidencias según el contrato del histórico. */
const ROLES_CON_CORRECCION: readonly RolTipo[] = [Rol.Supervisor, Rol.Coordinador];

/** Indica si la sesión puede mostrar el gesto de resolver/cerrar una incidencia. */
export function puedeCorregirIncidencia(rol: RolTipo): boolean {
  return ROLES_CON_CORRECCION.includes(rol);
}

/** Alias semántico para consumidores que modelan la visibilidad como predicado. */
export const esVisibleCorreccion = puedeCorregirIncidencia;
