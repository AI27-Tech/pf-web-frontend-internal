/*
 * Contrato de sesión — PROVISIONAL.
 *
 * TODO(contracts): estos tipos están escritos a mano desde docs/arquitectura/.
 * Los nombres del wire (snake_case) son suposiciones hasta que exista
 * contracts/openapi/bff.yaml. Ver "Decisiones abiertas #1" en el README.
 *
 * El login va contra bff (POST /api/v1/sesion), nunca contra Cognito directamente.
 */

/** Audiencia del token. Este panel opera enteramente bajo `Interno` (P10). */
export type Audiencia = 'Interno' | 'Cliente';

/** Rol interno del operador. Gobierna qué comandos y exportaciones se autorizan. */
export type RolInterno = 'operador' | 'ejecutivo' | 'supervisor' | 'auditor';

/** Credenciales de login. Forma del wire (snake_case) hacia bff. */
export interface CredentialsWire {
  email: string;
  password: string;
}

/** Respuesta de bff al iniciar o refrescar sesión. Forma del wire (snake_case). */
export interface SesionWire {
  access_token: string;
  refresh_token: string;
  /** Segundos de vida del access_token desde la emisión. */
  expires_in: number;
  usuario: UsuarioWire;
}

/** Identidad del operador tal como llega del wire (snake_case). */
export interface UsuarioWire {
  id: string;
  email: string;
  name: string;
  rol: RolInterno;
  audiencia: Audiencia;
}

/** Modelo de sesión que consume la app (ya parseado). */
export interface Sesion {
  accessToken: string;
  refreshToken: string;
  /** Marca de tiempo absoluta (epoch ms) en la que expira el access_token. */
  expiraEn: number;
  usuario: Usuario;
}

/** Identidad del operador en el modelo de la app. */
export interface Usuario {
  id: string;
  email: string;
  name: string;
  rol: RolInterno;
  audiencia: Audiencia;
}

/**
 * Convierte la respuesta del wire al modelo de la app. Es el único punto donde
 * el snake_case del contrato se traduce; el resto de la app habla `Sesion`.
 */
export function parseSesion(wire: SesionWire, ahora: number = Date.now()): Sesion {
  return {
    accessToken: wire.access_token,
    refreshToken: wire.refresh_token,
    expiraEn: ahora + wire.expires_in * 1000,
    usuario: {
      id: wire.usuario.id,
      email: wire.usuario.email,
      name: wire.usuario.name,
      rol: wire.usuario.rol,
      audiencia: wire.usuario.audiencia,
    },
  };
}
