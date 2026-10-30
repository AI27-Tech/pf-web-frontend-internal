import { refrescarSesion } from './sesion';
import type { Sesion } from '../contracts';

let refrescoEnVuelo: Promise<Sesion> | null = null;

/** Comparte un único refresco entre peticiones que reciben 401 en paralelo. */
export function refrescarSesionCoordinado(refreshToken: string): Promise<Sesion> {
  if (refrescoEnVuelo !== null) return refrescoEnVuelo;

  const actual = refrescarSesion(refreshToken);
  const coordinado = actual.finally(() => {
    if (refrescoEnVuelo === coordinado) refrescoEnVuelo = null;
  });
  refrescoEnVuelo = coordinado;
  return coordinado;
}
