/*
 * Contratos de la administración (E8-T19).
 *
 * `Rol` y `ROLES` vienen del contrato generado; no hay lista local de roles.
 * Los modelos de este archivo son el modelo de vista de trabajo: el `bff` aún
 * no publica estas operaciones (BRECHAS.md, B-1 a B-5). No son tipos de wire.
 * Se reemplazan por los tipos generados al cerrar la tarea 19.2.
 */

import { ROLES, type Rol } from '@ai27-tech/contracts/roles';

export type { Rol } from '@ai27-tech/contracts/roles';
export type { Unidad } from './unidades';

/** Opciones del selector de rol: exactamente los valores del enum `Rol` (ocho, sin Auditor). */
export const OPCIONES_ROL: readonly Rol[] = ROLES;

/** Organización de Cliente (R9). `tenant` es solo lectura para la interfaz. */
export interface Organizacion {
  readonly id: string;
  readonly nombre: string;
  readonly correo: string;
  readonly telefono: string;
  readonly tenant: string;
  readonly activa: boolean;
}

/** Datos capturables de una organización (R9.11). */
export interface DatosOrganizacion {
  readonly nombre: string;
  readonly correo: string;
  readonly telefono: string;
}

/** Vista resumida de un usuario en el listado. `organizacionId` solo aplica al rol `cliente`. */
export interface UsuarioResumen {
  readonly id: string;
  readonly nombre: string;
  readonly identificadorUsuario: string;
  readonly rol: Rol | null;
  readonly activo: boolean;
  readonly organizacionId?: string;
  /** Identificador comparable con el `sub` de la sesión. Lo entrega el `bff` (B-14). */
  readonly idpSubject?: string | null;
}

/**
 * Forma provisional del alcance de monitoreo (B-4). Hasta publicar el contrato
 * solo se usa para tipar el puerto.
 */
export interface AlcanceEfectivo {
  readonly ids: readonly string[];
}

/** Detalle de un usuario: el resumen más su alcance cuando aplique. */
export interface UsuarioDetalle extends UsuarioResumen {
  readonly alcance?: AlcanceEfectivo;
}

/** Parámetros del listado de usuarios (B-2). */
export interface ConsultaUsuarios {
  readonly texto?: string;
  readonly rol?: Rol;
  readonly cursor?: string;
}

/** Página del listado de usuarios, con cursor opaco (B-2). */
export interface PaginaUsuarios {
  readonly items: readonly UsuarioResumen[];
  readonly cursorSiguiente: string | null;
}

/** Comando de alta. No lleva `tenant_id`: la interfaz nunca lo captura (R3.5). */
export interface AltaUsuario {
  readonly nombre: string;
  readonly identificadorUsuario: string;
  readonly rol: Rol;
  readonly organizacionId?: string;
}

/** Consecuencia de desactivar una organización (R10.2). */
export interface ConsecuenciaDesactivacion {
  readonly usuariosActivos: number;
  readonly usuarios: readonly { readonly nombre: string; readonly identificadorUsuario: string }[];
}

/** Cambio de alcance. Forma provisional hasta B-4. */
export interface CambioAlcance {
  readonly ids: readonly string[];
}

/** Resultado informativo de la revocación masiva. Forma provisional hasta B-5. */
export interface ResultadoRevocacion {
  readonly sinSesiones: boolean;
}
