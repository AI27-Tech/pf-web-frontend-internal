import { MATRIZ, type Capacidad } from './capacidades';

/**
 * ¿El rol tiene la capacidad? Un rol nulo, ausente o desconocido la niega.
 * Recibe `string` a propósito: el rol de una sesión puede traer un valor que el
 * enum generado todavía no conoce.
 */
export function puede(rol: string | null | undefined, capacidad: Capacidad): boolean {
  if (!rol) return false;
  return (MATRIZ[capacidad] as readonly string[]).includes(rol);
}
