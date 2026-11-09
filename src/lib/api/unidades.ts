/*
 * Wrapper de dominio para el roster de unidades (E8-T10, E8-T19, E8-T21).
 *
 * `GET /unidades` (`listarUnidades`) es superficie real del `bff` desde
 * tracer.18; el alta y la edición (`crearUnidad`, `modificarUnidad`), desde
 * tracer.39. Las reglas del roster (exclusividad, reserva vigente, cantidad por
 * tipo) las aplica `operacion`; aquí solo se reenvía y se propaga el `ApiError`
 * con su `codigo`.
 */

import type {
  PaginaUnidades,
  Unidad,
  UnidadEntrada,
  UnidadModificacion,
} from '../contracts/unidades';
import { request } from './client';

/** Lista las unidades del roster que el Jefe Operativo puede elegir. */
export async function listarUnidades(accessToken: string): Promise<Unidad[]> {
  const pagina = await request<PaginaUnidades>('/unidades', { accessToken });
  return pagina.items;
}

/**
 * Consume todas las páginas del roster. El selector de alcance necesita el
 * conjunto completo y no expone cursores en la interfaz (E8-T19, R6.1).
 */
export async function listarTodasUnidades(accessToken: string): Promise<Unidad[]> {
  const unidades: Unidad[] = [];
  let cursor: string | null = null;
  do {
    const query: string = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const pagina: PaginaUnidades = await request<PaginaUnidades>(`/unidades${query}`, {
      accessToken,
    });
    unidades.push(...pagina.items);
    const siguiente: string | null = pagina.cursor_siguiente;
    if (siguiente === cursor) break;
    cursor = siguiente;
  } while (cursor);
  return unidades;
}

/** Una página del roster; sin `cursor` pide la primera. */
export function listarPaginaUnidades(
  accessToken: string,
  cursor?: string,
): Promise<PaginaUnidades> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return request<PaginaUnidades>(`/unidades${query}`, { accessToken });
}

/** Da de alta una unidad. Responde 201 con la unidad legible. */
export function crearUnidad(entrada: UnidadEntrada, accessToken: string): Promise<Unidad> {
  return request<Unidad>('/unidades', { method: 'POST', body: entrada, accessToken });
}

/** Modifica una unidad: vehículo, custodios o `activa`. */
export function modificarUnidad(
  id: string,
  cambios: UnidadModificacion,
  accessToken: string,
): Promise<Unidad> {
  return request<Unidad>(`/unidades/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: cambios,
    accessToken,
  });
}
