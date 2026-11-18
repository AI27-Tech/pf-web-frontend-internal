/*
 * Wrapper de dominio de "mis unidades" de cada Monitorista (E8-T21, tracer.40).
 *
 * `listarSujetos`, `obtenerAlcanceSujeto` y `fijarUnidadesSujeto` del `bff`. El
 * `jefe_operativo` solo lee con `rol=monitorista`; las reglas (rol con alcance,
 * usuario activo, unidad existente) las aplica el servidor y aquí solo se propaga
 * el `ApiError` con su `codigo`.
 */

import type {
  AlcanceSujeto,
  PaginaUsuariosAdmin,
  UnidadesSujetoEntrada,
} from '../contracts/alcance';
import { request } from './client';

/** Una página de Monitoristas activos; sin `cursor` pide la primera. */
export function listarMonitoristasActivos(
  accessToken: string,
  cursor?: string,
): Promise<PaginaUsuariosAdmin> {
  const query = new URLSearchParams({ rol: 'monitorista', activo: 'true' });
  if (cursor) query.set('cursor', cursor);
  return request<PaginaUsuariosAdmin>(`/sujetos?${query.toString()}`, { accessToken });
}

export function obtenerAlcanceSujeto(id: string, accessToken: string): Promise<AlcanceSujeto> {
  return request<AlcanceSujeto>(`/sujetos/${encodeURIComponent(id)}/alcance`, { accessToken });
}

/** Reemplaza el conjunto completo de unidades del Monitorista. Responde 204. */
export function fijarUnidadesSujeto(
  id: string,
  entrada: UnidadesSujetoEntrada,
  accessToken: string,
): Promise<void> {
  return request<void>(`/sujetos/${encodeURIComponent(id)}/alcance/unidades`, {
    method: 'PUT',
    body: entrada,
    accessToken,
  });
}
