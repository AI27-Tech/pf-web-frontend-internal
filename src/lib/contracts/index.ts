/*
 * Barrel de contratos (PROVISIONALES).
 *
 * Los tipos de lib/contracts/ están escritos a mano desde docs/arquitectura/ y
 * serán sustituidos por los generados desde contracts/openapi/bff.yaml.
 * Ver "Decisiones abiertas #1" en el README.
 */

export type {
  Audiencia,
  RolInterno,
  CredentialsWire,
  SesionWire,
  UsuarioWire,
  Sesion,
  Usuario,
} from './sesion';
export { parseSesion } from './sesion';
