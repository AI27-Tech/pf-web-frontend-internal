import type { Estadia } from '@/lib/contracts/historicoViaje';

/** Duración derivada en milisegundos; devuelve null si la fecha inicial no es válida. */
export function duracionEstadia(
  estadia: Pick<Estadia, 'inicio' | 'cierre'>,
  ahora: Date | string | number = new Date(),
): number | null {
  const inicio = new Date(estadia.inicio).getTime();
  if (Number.isNaN(inicio)) return null;

  const cierre = estadia.cierre ?? null;
  const fin = cierre === null ? new Date(ahora).getTime() : new Date(cierre).getTime();
  if (Number.isNaN(fin)) return null;

  return Math.max(0, fin - inicio);
}
