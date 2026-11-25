/*
 * Roles de la política de capacidades.
 *
 * El tipo y la lista salen del paquete generado (`@ai27-tech/contracts/roles`);
 * no se redefinen aquí. `cliente` es el único rol externo y no pertenece a este panel.
 */
import { ROLES, Rol, esInterno } from '@ai27-tech/contracts/roles';

export { Rol };
export type RolTipo = Rol;

/** Roles que pueden iniciar sesión en el panel interno. */
export const ROLES_INTERNOS: readonly Rol[] = ROLES.filter(esInterno);
