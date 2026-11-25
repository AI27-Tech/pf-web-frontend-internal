/*
 * Autorización de los handlers mock: emula la frontera del BFF (Requirement T3).
 *
 * No es lógica del frontend real. Lee el rol del token demo y responde `401` o `403` como
 * lo haría el servidor, usando la misma política de capacidades que la interfaz.
 */
import { HttpResponse } from 'msw';
import { decodificarClaims, rolValido } from '@/lib/contracts/jwt';
import type { Rol } from '@/lib/contracts';
import { puede, type Capacidad } from '@/lib/permisos';

/** Rol del token de la petición; `null` si falta o no se puede decodificar. */
export function rolDeSolicitud(request: Request): Rol | null {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const claims = decodificarClaims(token);
  return claims ? rolValido(claims) : null;
}

/**
 * `401` sin token válido y `403` si el rol no tiene la capacidad; `null` si pasa.
 * Quien llama devuelve la respuesta cuando no es `null`.
 */
export function autorizarMock(request: Request, capacidad: Capacidad): Response | null {
  const rol = rolDeSolicitud(request);
  if (rol === null) {
    return HttpResponse.json(
      { codigo: 'no_autorizado', mensaje: 'token ausente o inválido' },
      { status: 401 },
    );
  }
  if (!puede(rol, capacidad)) {
    return HttpResponse.json(
      { codigo: 'prohibido', mensaje: `el rol ${rol} no puede realizar esta operación` },
      { status: 403 },
    );
  }
  return null;
}
