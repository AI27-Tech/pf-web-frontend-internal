/*
 * Quién arma el roster (DEC-142 #3 y #6). Catálogos decide con `catalogos.ver` y
 * `catalogos.escribir` de la política (`@/lib/permisos`); la autoridad real es el 403 del `bff`.
 */
import type { Rol as RolTipo } from '@ai27-tech/contracts/roles';
import { puede } from '@/lib/permisos';

/** Arman el roster y leen vehículos y custodios en /roster: adaptador sobre la política. */
export function puedeArmarRoster(rol: RolTipo | undefined): boolean {
  return puede(rol, 'roster.ver');
}
