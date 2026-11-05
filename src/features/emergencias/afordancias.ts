/*
 * Afordancias de emergencias: funciones puras que deciden si mostrar un gesto.
 *
 * Solo ocultan o muestran controles. La autorización real la decide el `bff` en
 * cada petición (DEC-132). No calculan ventanas de tiempo ni alcance por unidad.
 */
import type { Rol } from '@ai27-tech/contracts/roles';
import type { EstadoEmergencia, Reclamo } from '@/lib/contracts/emergencias';
import { esTerminal } from '@/lib/contracts/viajeDetalle';

/** Vista mínima del caso que necesitan las afordancias. */
export interface CasoParaAfordancias {
  estado: EstadoEmergencia;
  reclamo_activo?: Reclamo | null;
}

const ROLES_MONITOREO = ['monitorista', 'supervisor', 'coordinador'] as const;
const ROLES_QUE_DEVUELVEN = ['supervisor', 'coordinador'] as const;

function tieneRol(rol: Rol | null | undefined, lista: readonly string[]): boolean {
  return rol !== null && rol !== undefined && lista.includes(rol);
}

/** Reclamar: solo Reacción, sobre un caso `abierta` sin responsable. */
export function puedeReclamar(rol: Rol | null, caso: CasoParaAfordancias): boolean {
  return rol === 'reaccion' && caso.estado === 'abierta' && !caso.reclamo_activo;
}

/** Devolver al pool: el responsable vigente, o supervisor/coordinador. */
export function puedeDevolver(
  rol: Rol | null,
  caso: CasoParaAfordancias,
  sujetoId: string,
): boolean {
  if (caso.estado !== 'en_atencion' || !caso.reclamo_activo) return false;
  return caso.reclamo_activo.responsable_id === sujetoId || tieneRol(rol, ROLES_QUE_DEVUELVEN);
}

/** Resolver: solo Reacción y solo el responsable vigente. */
export function puedeResolver(
  rol: Rol | null,
  caso: CasoParaAfordancias,
  sujetoId: string,
): boolean {
  return (
    rol === 'reaccion' &&
    caso.estado === 'en_atencion' &&
    caso.reclamo_activo?.responsable_id === sujetoId
  );
}

/** Cerrar: caso ya `resuelta`, para monitoreo o administrador (nunca Reacción ni ejecutivo). */
export function puedeCerrar(rol: Rol | null, caso: CasoParaAfordancias): boolean {
  return caso.estado === 'resuelta' && (tieneRol(rol, ROLES_MONITOREO) || rol === 'administrador');
}

/**
 * Activar: monitoreo, sobre un viaje no terminal. Los terminales salen de
 * `esTerminal` del paquete generado; no se copia la lista.
 */
export function puedeActivar(rol: Rol | null, estadoViaje: string): boolean {
  const estadoTipado = estadoViaje as Parameters<typeof esTerminal>[0];
  return tieneRol(rol, ROLES_MONITOREO) && !esTerminal(estadoTipado);
}

/** Anotar: monitoreo y administrador, mientras el caso no esté `cerrada`. */
export function puedeAnotar(rol: Rol | null, caso: CasoParaAfordancias): boolean {
  return (tieneRol(rol, ROLES_MONITOREO) || rol === 'administrador') && caso.estado !== 'cerrada';
}
