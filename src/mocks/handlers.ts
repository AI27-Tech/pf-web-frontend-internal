/*
 * Handlers del bff simulado (MSW).
 *
 * Solo cubren la sesión por ahora. Devuelven forma de contrato (snake_case) y
 * los códigos que la app clasifica en su taxonomía de errores: un 401 en login
 * se presenta como credenciales inválidas.
 */

import { http, HttpResponse } from 'msw';

import { API_PREFIX } from '@/lib/constants';
import type { CredencialesEntrada } from '@/lib/contracts';
import { DEMO_CREDENTIALS, createSessionWire } from './data';

const path = (segment: string) => `${API_PREFIX}${segment}`;

export const handlers = [
  // POST /sesion — login. Solo el operador demo entra.
  http.post(path('/sesion'), async ({ request }) => {
    const body = (await request.json()) as Partial<CredencialesEntrada>;
    const ok =
      body.usuario === DEMO_CREDENTIALS.usuario && body.contrasena === DEMO_CREDENTIALS.contrasena;

    if (!ok) {
      return HttpResponse.json({ mensaje: 'Credenciales inválidas' }, { status: 401 });
    }
    return HttpResponse.json(createSessionWire(), { status: 200 });
  }),

  // POST /sesion/refresh — renueva la sesión. El mock no valida el refresh_token.
  http.post(path('/sesion/refresh'), () => HttpResponse.json(createSessionWire(), { status: 200 })),

  // DELETE /sesion — cierre de sesión. Sin cuerpo.
  http.delete(path('/sesion'), () => new HttpResponse(null, { status: 204 })),
];
