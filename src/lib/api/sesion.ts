/*
 * Wrapper de dominio para la sesión. Superficie de audiencia interna.
 *
 *   POST   /sesion          → iniciar sesión (login contra bff, no contra Cognito)
 *   POST   /sesion/refresh  → refrescar; es donde los claims se reevalúan
 *   DELETE /sesion          → cerrar sesión
 *
 * Traduce la forma del wire (snake_case) al modelo de la app con `parseSesion`.
 * features/ y routes/ llaman aquí, nunca a client.ts.
 */

import { parseSesion, type CredentialsWire, type Sesion, type SesionWire } from '../contracts';
import { request } from './client';
import { ApiError } from './errors';

/** Inicia sesión contra bff. Un 401 se presenta como credenciales inválidas. */
export async function iniciarSesion(credentials: CredentialsWire): Promise<Sesion> {
  try {
    const wire = await request<SesionWire>('/sesion', { method: 'POST', body: credentials });
    return parseSesion(wire);
  } catch (error) {
    if (error instanceof ApiError && error.kind === 'noAutorizado') {
      throw new ApiError('invalidCredentials', 'Correo o contraseña incorrectos', error.status);
    }
    throw error;
  }
}

/** Refresca la sesión. El refresco reevalúa claims (ver README, "Sobre la sesión"). */
export async function refrescarSesion(refreshToken: string): Promise<Sesion> {
  const wire = await request<SesionWire>('/sesion/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
  return parseSesion(wire);
}

/** Cierra la sesión en bff. Best-effort desde la perspectiva del cliente. */
export async function cerrarSesion(accessToken: string): Promise<void> {
  await request<void>('/sesion', { method: 'DELETE', accessToken });
}
