/*
 * Utilidades pequeñas y sin dependencias.
 */

/** Une clases de Tailwind descartando falsy. El mínimo que sustituye a clsx. */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(' ');
}
