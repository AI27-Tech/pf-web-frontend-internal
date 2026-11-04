import { Rol, type Rol as RolTipo } from '@ai27-tech/contracts/roles';

/**
 * Roles que pueden ver el expediente y el monitoreo del viaje (E8-T17).
 * Es una afordancia de interfaz: la autoridad real la aplica el `bff`.
 */
export const ROLES_CON_MONITOREO: readonly RolTipo[] = [
  Rol.Monitorista,
  Rol.Supervisor,
  Rol.Coordinador,
  Rol.Administrador,
];

export function puedeUsarMonitoreo(rol: RolTipo): boolean {
  return ROLES_CON_MONITOREO.includes(rol);
}
