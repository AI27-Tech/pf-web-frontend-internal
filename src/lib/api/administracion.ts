/*
 * Puerto de administración (E8-T19).
 *
 * `AdministracionPort` es la costura entre la pantalla y el `bff`. Los nombres
 * de los métodos son de trabajo del frontend: NO son `operationId` del `bff`.
 * Hoy el `bff` no publica sujetos, roles, organizaciones, alcance ni revocación
 * (BRECHAS.md, B-1 a B-5), así que la única implementación es la "no publicada":
 * declara todas sus capacidades en `false` y cada método lanza
 * `ErrorSuperficieNoPublicada`. El adaptador HTTP real llega en la tarea 19.2.
 *
 * Fuera del puerto por requisito de V1: revocar por `sesion_id`, enumerar
 * sesiones, auditoría, historial, editar tenant, clientes de un Ejecutivo,
 * organización padre y transferencia de usuarios.
 */

import type {
  AltaUsuario,
  AlcanceEfectivo,
  CambioAlcance,
  ConsecuenciaDesactivacion,
  ConsultaUsuarios,
  DatosOrganizacion,
  Organizacion,
  PaginaUsuarios,
  ResultadoRevocacion,
  Rol,
  UsuarioDetalle,
} from '@/lib/contracts/administracion';

/** Capacidades publicadas por el `bff`, una por bloque de requisitos. */
export interface CapacidadesPublicadas {
  readonly usuarios: boolean;
  readonly organizaciones: boolean;
  readonly alcance: boolean;
  readonly revocacionMasiva: boolean;
}

export interface AdministracionPort {
  readonly capacidades: CapacidadesPublicadas;

  listarUsuarios(consulta: ConsultaUsuarios, accessToken: string): Promise<PaginaUsuarios>;
  obtenerUsuario(id: string, accessToken: string): Promise<UsuarioDetalle>;
  altaUsuario(alta: AltaUsuario, accessToken: string): Promise<UsuarioDetalle>;
  fijarRol(id: string, rol: Rol, accessToken: string): Promise<void>;
  desactivarUsuario(id: string, accessToken: string): Promise<void>;
  reactivarUsuario(id: string, accessToken: string): Promise<void>;
  editarUsuario(id: string, nombre: string, accessToken: string): Promise<void>;

  listarOrganizaciones(accessToken: string): Promise<Organizacion[]>;
  crearOrganizacion(datos: DatosOrganizacion, accessToken: string): Promise<Organizacion>;
  editarOrganizacion(
    id: string,
    datos: DatosOrganizacion,
    accessToken: string,
  ): Promise<Organizacion>;
  consultarConsecuencia(id: string, accessToken: string): Promise<ConsecuenciaDesactivacion>;
  desactivarOrganizacion(id: string, accessToken: string): Promise<void>;

  leerAlcance(id: string, accessToken: string): Promise<AlcanceEfectivo>;
  fijarAlcance(id: string, cambio: CambioAlcance, accessToken: string): Promise<AlcanceEfectivo>;

  revocarSesiones(id: string, motivo: string, accessToken: string): Promise<ResultadoRevocacion>;
}

/** Se lanza cuando la operación todavía no la publica el `bff`. */
export class ErrorSuperficieNoPublicada extends Error {
  constructor() {
    super('La superficie de administración no está publicada por el bff');
    this.name = 'ErrorSuperficieNoPublicada';
  }
}

function noPublicada(): never {
  throw new ErrorSuperficieNoPublicada();
}

/** Implementación por defecto: ninguna capacidad publicada, ninguna llamada de red. */
export const ADMINISTRACION_NO_PUBLICADA: AdministracionPort = {
  capacidades: {
    usuarios: false,
    organizaciones: false,
    alcance: false,
    revocacionMasiva: false,
  },
  listarUsuarios: async () => noPublicada(),
  obtenerUsuario: async () => noPublicada(),
  altaUsuario: async () => noPublicada(),
  fijarRol: async () => noPublicada(),
  desactivarUsuario: async () => noPublicada(),
  reactivarUsuario: async () => noPublicada(),
  editarUsuario: async () => noPublicada(),
  listarOrganizaciones: async () => noPublicada(),
  crearOrganizacion: async () => noPublicada(),
  editarOrganizacion: async () => noPublicada(),
  consultarConsecuencia: async () => noPublicada(),
  desactivarOrganizacion: async () => noPublicada(),
  leerAlcance: async () => noPublicada(),
  fijarAlcance: async () => noPublicada(),
  revocarSesiones: async () => noPublicada(),
};
