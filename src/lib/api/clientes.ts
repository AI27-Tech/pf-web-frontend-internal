/* Wrapper del catálogo de clientes proyectado por el BFF (tracer.20). */

import type { Cliente, PaginaClientes } from '@/lib/contracts/clientes';

import { request } from './client';

export interface ParamsListarClientes {
  readonly cursor?: string;
}

/** Obtiene una página de clientes ya filtrada por alcance y estado en el BFF. */
export async function listarClientes(
  params: ParamsListarClientes,
  accessToken: string,
): Promise<PaginaClientes> {
  const query = params.cursor ? `?cursor=${encodeURIComponent(params.cursor)}` : '';
  return request<PaginaClientes>(`/clientes${query}`, { accessToken });
}

/** Consume todas las páginas para poblar el selector sin exponer cursores en la UI. */
export async function listarTodosClientes(accessToken: string): Promise<Cliente[]> {
  const clientes: Cliente[] = [];
  let cursor: string | undefined;

  do {
    const pagina = await listarClientes(cursor ? { cursor } : {}, accessToken);
    clientes.push(...pagina.items);
    const siguiente = pagina.cursor_siguiente ?? undefined;
    if (siguiente === cursor) break;
    cursor = siguiente;
  } while (cursor);

  return clientes;
}
