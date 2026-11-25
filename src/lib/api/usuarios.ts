/*
 * Usuarios activos del rol `cotizacion`, para elegir el destino de una transferencia
 * (`listarSujetos` con `rol=cotizacion`; E10-HU-038, DEC-148 #74).
 *
 * Solo el `administrador` lee este listado. Un usuario `cotizacion` recibe `403` y no tiene cómo
 * elegir destino (Q-D de `BRECHAS.md`): el `ApiError` se propaga y la pantalla lo explica.
 */
import type { PaginaUsuariosAdmin, UsuarioAdmin } from '../contracts/alcance';
import { request } from './client';

/** Una página de usuarios `cotizacion` activos; sin `cursor` pide la primera. */
export function listarUsuariosCotizacionActivos(
  accessToken: string,
  cursor?: string,
): Promise<PaginaUsuariosAdmin> {
  const query = new URLSearchParams({ rol: 'cotizacion', activo: 'true' });
  if (cursor) query.set('cursor', cursor);
  return request<PaginaUsuariosAdmin>(`/sujetos?${query.toString()}`, { accessToken });
}

/** Recorre todas las páginas para poblar el selector sin exponer cursores en la UI. */
export async function listarTodosUsuariosCotizacion(accessToken: string): Promise<UsuarioAdmin[]> {
  const usuarios: UsuarioAdmin[] = [];
  let cursor: string | undefined;
  do {
    const pagina = await listarUsuariosCotizacionActivos(accessToken, cursor);
    usuarios.push(...pagina.items);
    const siguiente = pagina.cursor_siguiente ?? undefined;
    if (siguiente === cursor) break;
    cursor = siguiente;
  } while (cursor);
  return usuarios;
}
