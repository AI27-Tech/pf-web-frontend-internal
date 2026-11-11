import { Rol, type Rol as RolTipo } from '@ai27-tech/contracts/roles';

/**
 * Roles que pueden ver y usar la administración (E8-T19, R1.1).
 * Es una afordancia de interfaz: la autoridad real la aplica el `bff`.
 */
export const ROLES_ADMINISTRACION: readonly RolTipo[] = [Rol.Administrador];

export function puedeAdministrar(rol: RolTipo): boolean {
  return ROLES_ADMINISTRACION.includes(rol);
}
