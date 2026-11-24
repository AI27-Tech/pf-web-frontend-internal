import type { Rol } from '@ai27-tech/contracts/roles';
import { puede } from '@/lib/permisos';

/** Adaptador sobre la política (R1.1): se retira cuando nadie lo importe. */
export function puedeAdministrar(rol: Rol): boolean {
  return puede(rol, 'administracion.usuarios');
}
