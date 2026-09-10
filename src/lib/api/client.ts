/*
 * Cliente HTTP base contra bff.
 *
 * Es la única puerta de salida HTTP hacia bff (/api/v1/...). Los wrappers de
 * dominio se apoyan aquí; features/ y routes/ hablan con los wrappers, nunca con
 * este cliente. En modo mock, API_BASE_URL es vacío (mismo origen) y MSW
 * intercepta antes de que la petición salga a la red.
 */

import { API_BASE_URL, API_PREFIX } from '../constants';
import { ApiError, kindFromStatus } from './errors';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string;
}

/**
 * Emite una petición contra bff y devuelve el JSON parseado. Traduce los fallos
 * a `ApiError` con su clase: quien llama decide la política a partir de `kind`.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken } = options;

  const headers = new Headers({ Accept: 'application/json' });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (accessToken !== undefined) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError('red', `Fallo de red al llamar a ${path}`);
  }

  if (!response.ok) {
    throw new ApiError(kindFromStatus(response.status), `${method} ${path} → ${response.status}`, response.status);
  }

  // 204 No Content (p. ej. DELETE /sesion) no trae cuerpo.
  if (response.status === 204) return undefined as T;

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('red', `Respuesta no interpretable de ${path}`, response.status);
  }
}
