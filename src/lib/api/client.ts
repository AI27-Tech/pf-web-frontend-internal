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

/**
 * Extrae el `codigo` de negocio del cuerpo de una respuesta de error, tolerando
 * las dos formas que el contrato y los mocks producen: `{ codigo }` plano (forma
 * de `_comunes.yaml#/Error`) y `{ error: { codigo } }` anidada. Nunca lanza: si
 * el cuerpo falta o no es JSON, devuelve `undefined`.
 */
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
    // El `bff` serializa un código de negocio en el cuerpo (p. ej.
    // `transicion_no_permitida`). Lo leemos para que el wrapper de dominio
    // clasifique el 409 por `codigo` y no por el endpoint. Si el cuerpo no es
    // interpretable, `codigo` queda indefinido y la UI cae al caso genérico.
    const codigo = await leerCodigoError(response);
    throw new ApiError(
      kindFromStatus(response.status),
      `${method} ${path} → ${response.status}`,
      response.status,
      codigo,
    );
  }

  // 204 No Content (p. ej. DELETE /sesion) no trae cuerpo.
  if (response.status === 204) return undefined as T;

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('red', `Respuesta no interpretable de ${path}`, response.status);
  }
}
