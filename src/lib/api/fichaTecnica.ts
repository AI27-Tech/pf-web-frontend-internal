/*
 * Wrapper de dominio para la ficha técnica y el catálogo GPS (E8-T12).
 *
 * Las features hablan con este wrapper y no con client.ts. Las dos operaciones
 * de ficha y el catálogo existen en el contrato tracer.21.
 */

import type {
  DispositivoGps,
  FichaTecnica,
  FichaTecnicaEntrada,
  PaginaGps,
} from '../contracts/fichaTecnica';
import { request } from './client';

/** Lee la ficha técnica confirmada por el BFF. */
export async function obtenerFicha(id: string, accessToken: string): Promise<FichaTecnica> {
  return request<FichaTecnica>(`/viajes/${id}/ficha`, { accessToken });
}

/** Guarda parcialmente la ficha; las colecciones se reemplazan en el BFF. */
export async function guardarFicha(
  id: string,
  entrada: FichaTecnicaEntrada,
  accessToken: string,
): Promise<FichaTecnica> {
  return request<FichaTecnica>(`/viajes/${id}/ficha`, {
    method: 'PATCH',
    body: entrada,
    accessToken,
  });
}

/** Obtiene el catálogo registrado de GPS. El BFF devuelve solo activos. */
export async function listarGps(accessToken: string): Promise<DispositivoGps[]> {
  const pagina = await request<PaginaGps>('/gps', { accessToken });
  return pagina.items.filter((dispositivo) => dispositivo.activo);
}
