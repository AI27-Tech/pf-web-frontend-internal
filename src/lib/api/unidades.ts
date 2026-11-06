/*
 * Wrapper de dominio para el roster de unidades (E8-T10, E8-T19).
 *
 * `GET /unidades` (`listarUnidades`) es superficie real del `bff` desde
 * tracer.18. La presentación solo consume la lista desempaquetada.
 */
import type { Unidad, PaginaUnidades } from '../contracts/unidades';
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
