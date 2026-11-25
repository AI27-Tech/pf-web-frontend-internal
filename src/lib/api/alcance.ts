/*
 * Wrapper de dominio de "mis clientes" de cada Monitorista (DEC-149 #18, tracer.46).
 *
 * `listarSujetos`, `obtenerAlcanceSujeto` y `fijarClientesSujeto` del `bff`. El
 * `jefe_operativo` solo lee con `rol=monitorista`; las reglas (rol con alcance,
 * usuario activo, cliente activo) las aplica el servidor y aquí solo se propaga
 * el `ApiError` con su `codigo`.
 */

import type {
  AlcanceSujeto,
  MiAlcance,
  PaginaUsuariosAdmin,
  ClientesSujetoEntrada,
} from '../contracts/alcance';
import { request } from './client';

/**
 * Clientes efectivos del propio usuario (GET /sesion/alcance). Solo monitorista,
 * supervisor y coordinador; la UI no la llama con otro rol (Requirement T2.7).
 */
export function obtenerMiAlcance(accessToken: string): Promise<MiAlcance> {
  return request<MiAlcance>('/sesion/alcance', { accessToken });
}

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

/** Reemplaza el conjunto completo de clientes del Monitorista. Responde 204. */
export function fijarClientesSujeto(
  id: string,
  entrada: ClientesSujetoEntrada,
  accessToken: string,
): Promise<void> {
  return request<void>(`/sujetos/${encodeURIComponent(id)}/alcance/clientes`, {
    method: 'PUT',
    body: entrada,
    accessToken,
  });
}
