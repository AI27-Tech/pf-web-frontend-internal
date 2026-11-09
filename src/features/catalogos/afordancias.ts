/*
 * Quién ve y quién escribe vehículos y custodios (DEC-142 #3 y #6). Es afordancia
 * de interfaz: la autoridad real es el 403 del `bff`.
 */

import { Rol, type Rol as RolTipo } from '@ai27-tech/contracts/roles';

/** Arman el roster y leen vehículos y custodios: Jefe Operativo y Administrador. */
export const ROLES_ROSTER: readonly RolTipo[] = [Rol.JefeOperativo, Rol.Administrador];

export function puedeArmarRoster(rol: RolTipo | undefined): boolean {
  return rol !== undefined && ROLES_ROSTER.includes(rol);
}

/** Dan de alta y editan vehículos y custodios: solo el Administrador. */
export function puedeEscribirCatalogos(rol: RolTipo | undefined): boolean {
  return rol === Rol.Administrador;
}
