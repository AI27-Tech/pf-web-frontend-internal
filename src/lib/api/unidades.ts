/*
 * Wrapper de dominio para el roster de unidades (E8-T10).
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
