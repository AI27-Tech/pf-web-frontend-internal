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
import { refrescarSesionCoordinado } from './refreshCoordinator';
import { cortarSesion } from './sessionCut';
import { tokenStore } from './tokenStore';

async function leerCodigoError(response: Response): Promise<string | undefined> {
  try {
    const cuerpo: unknown = await response.clone().json();
    if (cuerpo && typeof cuerpo === 'object') {
      const plano = (cuerpo as { codigo?: unknown }).codigo;
      if (typeof plano === 'string') return plano;
      const anidado = (cuerpo as { error?: { codigo?: unknown } }).error?.codigo;
      if (typeof anidado === 'string') return anidado;
    }
  } catch {
    // Cuerpo ausente o no interpretable: sin código.
  }
  return undefined;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string;
  /** Control interno para limitar el reintento después de un refresco. */
  _reintentoPostRefresco?: boolean;
}

function esEndpointDeSesion(path: string, method: RequestOptions['method']): boolean {
  return path === '/sesion' || (path === '/sesion/refresh' && method === 'POST');
}

function errorSesionFinalizada(): ApiError {
  return new ApiError('sesionFinalizada', 'La sesión finalizó.', 401);
}

async function manejar401<T>(path: string, options: RequestOptions): Promise<T> {
  if (options._reintentoPostRefresco) {
    cortarSesion();
    throw errorSesionFinalizada();
  }

  const refreshToken = tokenStore.cargar()?.refreshToken;
  if (!refreshToken) {
    cortarSesion();
    throw errorSesionFinalizada();
  }

  try {
    const nuevaSesion = await refrescarSesionCoordinado(refreshToken);
    tokenStore.guardar(nuevaSesion);
    return request<T>(path, {
      ...options,
      accessToken: nuevaSesion.accessToken,
      _reintentoPostRefresco: true,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      cortarSesion();
      throw errorSesionFinalizada();
    }
    // Red y 5xx son degradación transitoria: se propagan sin cortar la sesión.
    throw error;
  }
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

  if (response.status === 401 && !esEndpointDeSesion(path, method)) {
    return manejar401<T>(path, options);
  }

  if (!response.ok) {
    const codigo = await leerCodigoError(response);
    throw new ApiError(
      kindFromStatus(response.status),
      `${method} ${path} → ${response.status}`,
      response.status,
      codigo,
    );
  }

  if (response.status === 204) return undefined as T;

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('red', `Respuesta no interpretable de ${path}`, response.status);
  }
}
