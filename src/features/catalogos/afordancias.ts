/*
 * Quién ve y quién escribe vehículos y custodios (DEC-142 #3 y #6). Es afordancia
 * de interfaz: la autoridad real es el 403 del `bff`.
 */
import { Rol, type Rol as RolTipo } from '@ai27-tech/contracts/roles';
import { puede } from '@/lib/permisos';

/** Arman el roster y leen vehículos y custodios: adaptador sobre la política. */
export function puedeArmarRoster(rol: RolTipo | undefined): boolean {
  return puede(rol, 'roster.ver');
}

/**
 * Dan de alta y editan vehículos y custodios: hoy solo el Administrador.
 * Pendiente M13 (14.1): pasa a `catalogos.escribir` (COO y ADM) junto con la UI.
 */
export function puedeEscribirCatalogos(rol: RolTipo | undefined): boolean {
  return rol === Rol.Administrador;
}
