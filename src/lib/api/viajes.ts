/*
 * Wrapper de dominio para viajes. Superficie de audiencia interna.
 *
 *   GET /viajes  → listar viajes con filtro opcional por estado y cursor de paginación
 *
 * Traduce los parámetros de vista (estado, cursor) a query string del contrato,
 * emite la petición contra bff y devuelve la página. features/ y routes/ llaman
 * aquí, nunca a client.ts.
 */

import type { PaginaViajesResumen } from '../contracts/viajes';
import { request } from './client';

/** Parámetros de entrada para listar viajes. Omitir una clave = no filtrar. */
export interface ParamsListarViajes {
  readonly estado?: string;
  readonly cursor?: string;
}

/**
 * Construye la query string a partir de los parámetros de vista.
 * Solo incluye claves presentes (sin valores vacíos).
 *
 * @param params Objeto con estado y/o cursor
 * @returns Query string listo para URL (p. ej. "?estado=EN_RUTA&cursor=abc123")
 */
export function construirQueryString(params: ParamsListarViajes): string {
  const entries: Array<[string, string]> = [];

  if (params.estado !== undefined && params.estado !== '') {
    entries.push(['estado', params.estado]);
  }

  if (params.cursor !== undefined && params.cursor !== '') {
    entries.push(['cursor', params.cursor]);
  }

  if (entries.length === 0) return '';

  const sp = new URLSearchParams(entries);
  return `?${sp.toString()}`;
}

/**
 * Lista viajes del operador con filtro opcional por estado y paginación por cursor.
 * Las condiciones activas no vienen en V1; la brecha queda aislada en la capa de vista.
 */
export async function listarViajes(
  params: ParamsListarViajes,
  accessToken: string,
): Promise<PaginaViajesResumen> {
  const qs = construirQueryString(params);
  return request<PaginaViajesResumen>(`/viajes${qs}`, { accessToken });
}
