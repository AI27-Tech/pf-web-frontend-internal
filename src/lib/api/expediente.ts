import type { DescargaViaje } from '../contracts/expediente';
import { request } from './client';
import { ApiError } from './errors';

/** Error cuando la autorización no alcanza al expediente (sin permiso o fuera de alcance). */
export class ErrorDescargaProhibida extends ApiError {
  constructor() {
    super('noAutorizado', 'No tienes autorización para descargar este expediente.', 403);
    this.name = 'ErrorDescargaProhibida';
  }
}

/** Error cuando el viaje solicitado no existe. */
export class ErrorViajeInexistente extends ApiError {
  constructor() {
    super('noEncontrado', 'El viaje no existe.', 404);
    this.name = 'ErrorViajeInexistente';
  }
}

function clasificarErrorDescarga(error: unknown): never {
  if (!(error instanceof ApiError)) throw error;

  if (error.status === 403) throw new ErrorDescargaProhibida();
  if (error.status === 404) throw new ErrorViajeInexistente();

  throw error;
}

/**
 * Descarga el expediente del viaje. Devuelve el JSON del `bff` sin transformarlo.
 * El `401` no se clasifica aquí: `request` ya intentó el refresco y lanza
 * `sesionFinalizada`, que pasa sin cambio.
 */
export async function descargarViaje(id: string, accessToken: string): Promise<DescargaViaje> {
  try {
    return await request<DescargaViaje>(`/viajes/${id}/descarga`, { accessToken });
  } catch (error) {
    clasificarErrorDescarga(error);
  }
}
