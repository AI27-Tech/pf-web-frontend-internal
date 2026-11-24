import type { Rol } from '@ai27-tech/contracts/roles';
import { puede } from '@/lib/permisos';

/** Adaptador sobre la política (E8-T17): se retira cuando nadie lo importe. */
export function puedeUsarMonitoreo(rol: Rol): boolean {
  return puede(rol, 'monitoreo.dashboard');
}
