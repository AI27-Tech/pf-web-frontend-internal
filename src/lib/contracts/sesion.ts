/*
 * Contrato de sesión — consumido desde `@ai27-tech/contracts`.
 *
 * La forma del wire (`Sesion`, `CredencialesEntrada`, `RefrescoEntrada`) viene
 * del paquete generado, no escrita a mano. El login va contra bff
 * (POST /api/v1/sesion), nunca contra Cognito directamente.
 *
 * El cuerpo de `Sesion` NO trae `rol` ni `usuario`: eso vive en los claims del
 * access_token (ver jwt.ts). `parseSesion` deriva el usuario de ahí. Si el token
 * no trae un rol válido, la sesión se considera inválida y `parseSesion` lanza:
 * no se construye una sesión con un rol a medias.
 */

import type { components } from '@ai27-tech/contracts/openapi/bff';
import type { Rol } from '@ai27-tech/contracts/roles';

import { decodificarClaims, rolValido, audienciaDeRol, type Audiencia } from './jwt';

/** Forma del wire generada por el contrato. */
export type SesionWire = components['schemas']['Sesion'];
export type CredencialesEntrada = components['schemas']['CredencialesEntrada'];
export type RefrescoEntrada = components['schemas']['RefrescoEntrada'];

/** Identidad del operador en el modelo de la app, derivada de los claims del JWT. */
export interface Usuario {
  /** Sujeto del token (claim `sub`). */
  id: string;
  rol: Rol;
  audiencia: Audiencia;
}

/** Modelo de sesión que consume la app (ya parseado). */
export interface Sesion {
  /** Id de sesión del cuerpo (`sesion_id`); lo necesita E8-T6/ADR 26 para revocación. */
  sesionId: string;
  accessToken: string;
  /** Opcional en el contrato: puede no venir en cada respuesta. */
  refreshToken?: string;
  /** Marca de tiempo absoluta (epoch ms) en la que expira el access_token. */
  expiraEn: number;
  usuario: Usuario;
}

/** Se lanza cuando el access_token no permite construir una sesión válida. */
export class SesionInvalidaError extends Error {
  constructor(motivo: string) {
    super(`Sesión inválida: ${motivo}`);
    this.name = 'SesionInvalidaError';
  }
}

/**
 * Convierte la respuesta del wire al modelo de la app. Único punto donde se
 * traduce el contrato y donde se derivan rol/audiencia de los claims del token.
 *
 * `expira_en` es una marca de tiempo RFC 3339 (MarcaTiempo), no segundos de vida.
 */
export function parseSesion(wire: SesionWire): Sesion {
  const claims = decodificarClaims(wire.access_token);
  if (claims === null) {
    throw new SesionInvalidaError('el access_token no pudo decodificarse');
  }

  const rol = rolValido(claims);
  if (rol === null) {
    throw new SesionInvalidaError(`rol no reconocido: ${claims.rol}`);
  }

  return {
    sesionId: wire.sesion_id,
    accessToken: wire.access_token,
    // `exactOptionalPropertyTypes`: solo incluir refreshToken si el wire lo trae.
    ...(wire.refresh_token !== undefined ? { refreshToken: wire.refresh_token } : {}),
    expiraEn: new Date(wire.expira_en).getTime(),
    usuario: {
      id: claims.sub,
      rol,
      audiencia: audienciaDeRol(rol),
    },
  };
}
