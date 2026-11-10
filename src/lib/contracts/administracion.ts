/*
 * Contratos de la administración (E8-T19).
 *
 * `Rol` y `ROLES` vienen del contrato generado; no hay lista local de roles.
 * Los tipos de wire (`UsuarioAdmin`, `Organizacion`, `AlcanceSujeto`, etc.) son
 * los generados en `@ai27-tech/contracts` (tracer.40). Los modelos de vista de
 * este archivo son los que consume la interfaz; el adaptador HTTP traduce entre
 * ambos (`lib/api/administracion.ts`).
 */

import type { components } from '@ai27-tech/contracts/openapi/bff';
import { ROLES, type Rol } from '@ai27-tech/contracts/roles';

export type { Rol } from '@ai27-tech/contracts/roles';
export type { Unidad } from './unidades';

type Schemas = components['schemas'];

/** Tipos de wire de la superficie de administración (generados). */
export type UsuarioAdmin = Schemas['UsuarioAdmin'];
export type PaginaUsuariosAdmin = Schemas['PaginaUsuariosAdmin'];
export type AltaSujetoEntrada = Schemas['AltaSujetoEntrada'];
export type OrganizacionWire = Schemas['Organizacion'];
export type PaginaOrganizaciones = Schemas['PaginaOrganizaciones'];
export type OrganizacionEntrada = Schemas['OrganizacionEntrada'];
export type OrganizacionCambios = Schemas['OrganizacionCambios'];
export type AlcanceSujeto = Schemas['AlcanceSujeto'];
export type RevocacionSesionesResultado = Schemas['RevocacionSesionesResultado'];

/** Opciones del selector de rol: exactamente los valores del enum `Rol` (ocho, sin Auditor). */
export const OPCIONES_ROL: readonly Rol[] = ROLES;

/**
 * Organización de Cliente (R9). El identificador de la organización es su tenant
 * (DEC-112): se muestra de solo lectura. `correo` y `telefono` son opcionales en
 * el wire: una organización dada de alta antes de tracer.40 no los tiene.
 */
export interface Organizacion {
  readonly id: string;
  readonly nombre: string;
  readonly correo?: string;
  readonly telefono?: string;
  readonly activa: boolean;
  /** Usuarios activos de la organización, tal como los cuenta el `bff`. */
  readonly usuariosActivos: number;
}

/** Datos capturables de una organización (R9.11). */
export interface DatosOrganizacion {
  readonly nombre: string;
  readonly correo: string;
  readonly telefono: string;
}

/**
 * Alta de organización. `id` lo genera el panel al abrir el diálogo y se reutiliza
 * al reintentar, de modo que un alta a medias se completa en lugar de duplicarse
 * (DEC-144 #2).
 */
export interface AltaOrganizacion extends DatosOrganizacion {
  readonly id?: string;
}

/** Organización resumida de un usuario `cliente`. */
export interface OrganizacionResumen {
  readonly id: string;
  readonly nombre: string;
}

/**
 * Vista resumida de un usuario. `nombre` e `identificadorUsuario` son opcionales:
 * un usuario dado de alta antes de tracer.40 no los tiene en `identidad` y la
 * interfaz muestra un texto de respaldo (B-15). `esPropio` lo resuelve el
 * servidor contra el token (B-14); ausente significa "sin respuesta".
 */
export interface UsuarioResumen {
  readonly id: string;
  readonly nombre?: string;
  readonly identificadorUsuario?: string;
  readonly rol: Rol | null;
  readonly activo: boolean;
  readonly organizacion?: OrganizacionResumen;
  readonly esPropio?: boolean;
}

/** Alcance de monitoreo tal como lo devuelve el `bff` (DEC-140). */
export interface AlcanceEfectivo {
  /** Unidades asignadas directamente ("mis unidades"); solo un Monitorista tiene. */
  readonly unidadesIds: readonly string[];
  /** Subordinados directos (Monitoristas de un Supervisor, Supervisores de un Coordinador). */
  readonly subordinadosIds: readonly string[];
  /** Unión, sin repetidos, de las unidades propias y las de los subordinados. */
  readonly unidadesEfectivasIds: readonly string[];
}

/** Detalle de un usuario: el resumen más su alcance cuando aplique. */
export interface UsuarioDetalle extends UsuarioResumen {
  readonly alcance?: AlcanceEfectivo;
}

/** Parámetros del listado de usuarios (B-2). */
export interface ConsultaUsuarios {
  readonly texto?: string;
  readonly rol?: Rol;
  /** Id de la organización (es su tenant, DEC-112). */
  readonly organizacionId?: string;
  readonly activo?: boolean;
  readonly cursor?: string;
}

/** Página del listado de usuarios, con cursor opaco (B-2). */
export interface PaginaUsuarios {
  readonly items: readonly UsuarioResumen[];
  readonly cursorSiguiente: string | null;
}

/**
 * Comando de alta. No lleva `tenant_id`: la interfaz nunca lo captura (R3.5).
 * `organizacionId` es obligatoria para `cliente` y está prohibida para un rol interno.
 */
export interface AltaUsuario {
  readonly nombre: string;
  readonly identificadorUsuario: string;
  readonly rol: Rol;
  readonly organizacionId?: string;
}

/** Consecuencia de desactivar una organización (R10.2). */
export interface ConsecuenciaDesactivacion {
  readonly usuariosActivos: number;
  readonly usuarios: readonly {
    readonly nombre?: string;
    readonly identificadorUsuario?: string;
  }[];
}

/**
 * Cambio de alcance. Los dos reemplazan la lista completa (DEC-145): se envía
 * siempre el conjunto final. Las unidades son de un Monitorista; los subordinados,
 * de un Supervisor (Monitoristas) o de un Coordinador (Supervisores).
 */
export type CambioAlcance =
  | { readonly tipo: 'unidades'; readonly ids: readonly string[] }
  | { readonly tipo: 'subordinados'; readonly ids: readonly string[] };

/** Resultado de la revocación masiva: cuántas sesiones vivas se revocaron (0 si no tenía). */
export interface ResultadoRevocacion {
  readonly sesionesRevocadas: number;
}
