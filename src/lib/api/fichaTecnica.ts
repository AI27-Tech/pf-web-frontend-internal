/*
 * Wrapper de dominio para la ficha técnica del viaje (E8-T12).
 *
 * La feature habla con este wrapper y no con client.ts. La operación publicada
 * por el contrato es GET /viajes/{id}/ficha; la escritura PATCH se implementará
 * en la frontera del adaptador cuando se ejecute la tarea correspondiente.
 */

import type { FichaTecnica } from '../contracts/fichaTecnica';
import { request } from './client';

/** Lee la ficha técnica confirmada por el BFF. */
export async function obtenerFicha(id: string, accessToken: string): Promise<FichaTecnica> {
  return request<FichaTecnica>(`/viajes/${id}/ficha`, { accessToken });
}
