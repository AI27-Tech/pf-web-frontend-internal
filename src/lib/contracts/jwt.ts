/*
 * Decodificación de los claims del access_token (JWT).
 *
 * Por qué existe: el contrato HTTP (`@ai27-tech/contracts/openapi/bff`) modela
 * la respuesta `Sesion` del wire, pero NO el contenido del JWT. El cuerpo de
 * `Sesion` no trae `rol` ni `audiencia`: esos viajan en los claims del token.
 * El front-end los lee SOLO para enrutado/UX; la autorización real la decide el
 * servidor en cada petición (regla transversal 1 de E8-panel-admin.md).
 *
 * TODO(contracts): los nombres de claim (`rol`, `tenant_id`, `sesion_id`) son los
 * documentados en prosa en docs/arquitectura/services/identidad.md, no un esquema
 * generado. Es una brecha contractual conocida: el JWT no está en ninguna fuente
 * OpenAPI. Confirmar contra un token real emitido por el mapper del IdP (ADR 32 §4)
 * cuando E4-T1 lo tenga implementado. Toda la suposición vive aislada en este
 * archivo, de modo que corregirla sea un cambio de un solo punto.
 */

import { esRol, esInterno, type Rol } from '@ai27-tech/contracts/roles';

/** Audiencia de dominio (DEC-054). Distinta del claim técnico `aud` del JWT. */
export type Audiencia = 'Cliente' | 'Interno';

/**
 * Claims que el IdP firma en el access_token. Nombres según prosa de
 * docs/arquitectura/services/identidad.md — ver TODO(contracts) arriba.
 */
export interface ClaimsAi27 {
  /** Sujeto (estándar JWT). */
  readonly sub: string;
  /** Tenant del sujeto. Supuesto no confirmado contra el IdP real. */
  readonly tenant_id?: string;
  /** Rol del sujeto. Se valida con `esRol` antes de confiar en él. */
  readonly rol: string;
  /** Id de sesión; coincide con `Sesion.sesion_id` del cuerpo. */
  readonly sesion_id: string;
}

/**
 * Decodifica el payload de un JWT. Solo lee claims; no verifica la firma (eso lo
 * hace el servidor). Devuelve null ante cualquier token malformado.
 */
export function decodificarClaims(accessToken: string): ClaimsAi27 | null {
  const partes = accessToken.split('.');
  const segmentoPayload = partes[1];
  if (partes.length !== 3 || segmentoPayload === undefined) return null;

  try {
    const payload = decodificarBase64Url(segmentoPayload);
    const datos = JSON.parse(payload) as unknown;
    if (!esClaimsAi27(datos)) return null;
    return datos;
  } catch {
    return null;
  }
}

/**
 * Devuelve el rol si es uno de los 8 válidos (DEC-053), o null. Un valor fuera
 * del enum nunca se trata como rol: el llamante debe considerar la sesión inválida.
 */
export function rolValido(claims: ClaimsAi27): Rol | null {
  return esRol(claims.rol) ? claims.rol : null;
}

/**
 * Deriva la audiencia a partir del rol (DEC-054): `cliente` → `Cliente`, los otros
 * siete → `Interno`. No viaja como claim propio. Se apoya en `esInterno` generado.
 */
export function audienciaDeRol(rol: Rol): Audiencia {
  return esInterno(rol) ? 'Interno' : 'Cliente';
}

/** base64url → string UTF-8, con el ajuste de alfabeto y padding del estándar. */
function decodificarBase64Url(segmento: string): string {
  const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binario = atob(padded);
  // atob da una cadena binaria (latin1); reinterpretarla como UTF-8.
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Verifica que el payload decodificado tenga los campos string que esperamos. */
function esClaimsAi27(valor: unknown): valor is ClaimsAi27 {
  if (typeof valor !== 'object' || valor === null) return false;
  const obj = valor as Record<string, unknown>;
  return (
    typeof obj.sub === 'string' &&
    typeof obj.rol === 'string' &&
    typeof obj.sesion_id === 'string' &&
    (obj.tenant_id === undefined || typeof obj.tenant_id === 'string')
  );
}
