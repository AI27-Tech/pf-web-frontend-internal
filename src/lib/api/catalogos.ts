/*
 * Wrapper de vehículos y custodios (adelanto de E8-T16, DEC-142 #6, tracer.39).
 *
 * Leen `jefe_operativo` y `administrador`; escribe solo `administrador`. La guarda
 * de rol la aplica el `bff`: aquí no se decide nada, solo se reenvía y se propaga
 * el `ApiError`.
 */

import type {
  Custodio,
  CustodioCambios,
  CustodioEntrada,
  PaginaCustodios,
  PaginaVehiculos,
  Vehiculo,
  VehiculoCambios,
  VehiculoEntrada,
} from '../contracts/catalogos';
import { request } from './client';

// shortcut: recorre todas las páginas; si la flota llega a miles, paginar en la UI.
async function todasLasPaginas<T>(ruta: string, accessToken: string): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  do {
    const query: string = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const pagina: { items: T[]; cursor_siguiente: string | null } = await request(
      `${ruta}${query}`,
      { accessToken },
    );
    items.push(...pagina.items);
    // Un cursor que se repite cortaría en bucle infinito; se trata como fin.
    cursor = pagina.cursor_siguiente === cursor ? null : pagina.cursor_siguiente;
  } while (cursor);
  return items;
}

/** Todos los vehículos, activos e inactivos (`catalogos` no filtra por estado). */
export function listarVehiculos(accessToken: string): Promise<Vehiculo[]> {
  return todasLasPaginas<PaginaVehiculos['items'][number]>('/vehiculos', accessToken);
}

export function crearVehiculo(entrada: VehiculoEntrada, accessToken: string): Promise<Vehiculo> {
  return request<Vehiculo>('/vehiculos', { method: 'POST', body: entrada, accessToken });
}

export function actualizarVehiculo(
  id: string,
  cambios: VehiculoCambios,
  accessToken: string,
): Promise<Vehiculo> {
  return request<Vehiculo>(`/vehiculos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: cambios,
    accessToken,
  });
}

/** Todos los custodios, activos e inactivos. */
export function listarCustodios(accessToken: string): Promise<Custodio[]> {
  return todasLasPaginas<PaginaCustodios['items'][number]>('/custodios', accessToken);
}

export function crearCustodio(entrada: CustodioEntrada, accessToken: string): Promise<Custodio> {
  return request<Custodio>('/custodios', { method: 'POST', body: entrada, accessToken });
}

export function actualizarCustodio(
  id: string,
  cambios: CustodioCambios,
  accessToken: string,
): Promise<Custodio> {
  return request<Custodio>(`/custodios/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: cambios,
    accessToken,
  });
}
