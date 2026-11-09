/*
 * Afordancias de la pantalla de usuarios (E8-T19).
 *
 * Decide qué acciones se muestran habilitadas para un usuario objetivo. Es una
 * afordancia de interfaz: la autoridad real la aplica el `bff`. Falla cerrada:
 * ante una relación `indeterminado` no se habilita el cambio de rol ni de alcance.
 */

import { Rol, esInterno, type Rol as RolTipo } from '@ai27-tech/contracts/roles';

import { OPCIONES_ROL } from '@/lib/contracts/administracion';

import type { RelacionConSesion } from './relacionConSesion';
import { TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';

/**
 * Roles que el cambio de rol ofrece a un usuario. Un cliente no cambia de rol
 * desde esta pantalla, y un usuario interno solo recibe roles internos: no se
 * cruza entre el lado externo y el interno (R5.1).
 */
export function opcionesRolParaCambio(rolActual: RolTipo | null): readonly RolTipo[] {
  if (rolActual === Rol.Cliente) return [];
  return OPCIONES_ROL.filter((rol) => esInterno(rol));
}

/** Tipo de control de alcance según el rol del objetivo (R6.6). */
export type TipoAlcance = 'unidades' | 'monitoristas' | 'supervisores';

/**
 * Qué control de alcance aplica a un rol. Solo monitorista, supervisor y
 * coordinador tienen alcance; ejecutivo y el resto no (R6.5, R6.6).
 */
export function controlesDeAlcance(rol: Rol | null): TipoAlcance | null {
  switch (rol) {
    case Rol.Monitorista:
      return 'unidades';
    case Rol.Supervisor:
      return 'monitoristas';
    case Rol.Coordinador:
      return 'supervisores';
    default:
      return null;
  }
}

export interface ObjetivoAdministrado {
  readonly activo: boolean;
  readonly rol: Rol | null;
}

export interface Capacidades {
  readonly puedeCambiarRol: boolean;
  readonly puedeEditarAlcance: boolean;
  readonly puedeDesactivar: boolean;
  readonly puedeReactivar: boolean;
  readonly puedeRevocarSesiones: boolean;
  /** Motivo visible del bloqueo de rol y alcance; `null` si no hay bloqueo. */
  readonly motivoBloqueo: string | null;
}

function motivoBloqueo(
  objetivo: ObjetivoAdministrado,
  relacion: RelacionConSesion,
  enCurso: boolean,
): string | null {
  if (relacion === 'propio') return TEXTOS.propioRolAlcance;
  if (relacion === 'indeterminado') return TEXTOS.sinIdentificarSesion;
  if (!objetivo.activo) return TEXTOS.usuarioInactivo;
  if (enCurso) return TEXTOS.solicitudEnCurso;
  if (objetivo.rol === Rol.Cliente) return TEXTOS.cambioRolDeClienteNoEditable;
  return null;
}

/**
 * Capacidades del objetivo según su relación con la sesión, su estado y si hay
 * una solicitud en curso para él.
 *
 * - Rol y alcance: solo si el objetivo es ajeno, activo y sin solicitud en curso.
 * - Desactivar: no depende de la relación (PA-7); exige estar activo.
 * - Reactivar: exige estar inactivo.
 * - Revocar sesiones: solo sobre un ajeno; el estado lo decide el `bff`.
 */
export function capacidades(
  objetivo: ObjetivoAdministrado,
  relacion: RelacionConSesion,
  enCurso: boolean,
): Capacidades {
  const rolYAlcanceHabilitados = relacion === 'ajeno' && objetivo.activo && !enCurso;

  return {
    puedeCambiarRol: rolYAlcanceHabilitados && objetivo.rol !== Rol.Cliente,
    puedeEditarAlcance: rolYAlcanceHabilitados && controlesDeAlcance(objetivo.rol) !== null,
    puedeDesactivar: objetivo.activo && !enCurso,
    puedeReactivar: !objetivo.activo && !enCurso,
    puedeRevocarSesiones: relacion === 'ajeno' && !enCurso,
    motivoBloqueo: motivoBloqueo(objetivo, relacion, enCurso),
  };
}
