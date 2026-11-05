/*
 * Barrel de contratos.
 *
 * Único punto de entrada de los tipos de contrato para el resto de la app. La
 * forma del wire de sesión y el enum de roles vienen de `@ai27-tech/contracts`
 * (generados desde pf-pkg-contracts), no escritos a mano. Lo único propio de la
 * app es el modelo `Sesion`/`Usuario` (derivado de los claims del JWT) y la
 * decodificación de esos claims.
 */

// Enum de roles, directo del contrato generado.
export { Rol, ROLES, esRol, esInterno } from '@ai27-tech/contracts/roles';

// Modelo de sesión de la app + forma del wire generada.
export type { SesionWire, CredencialesEntrada, RefrescoEntrada, Sesion, Usuario } from './sesion';
export type { Cliente, PaginaClientes } from './clientes';
export type { AsignacionEntrada, AptitudRecurso, UnidadAsignada, Asignacion } from './viajeDetalle';
export type { FichaTecnica, FichaTecnicaEntrada, DispositivoGps, PaginaGps } from './fichaTecnica';
export { parseSesion, SesionInvalidaError } from './sesion';

// Claims del JWT (brecha contractual aislada).
export type { Audiencia, ClaimsAi27 } from './jwt';
export { decodificarClaims, rolValido, audienciaDeRol } from './jwt';
