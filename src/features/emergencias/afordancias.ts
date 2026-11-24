/*
 * Afordancias de emergencias: funciones puras que deciden si mostrar un gesto.
 *
 * Solo ocultan o muestran controles. La autorización real la decide el `bff` en
 * cada petición (DEC-132). No calculan ventanas de tiempo ni alcance por unidad.
 */
import type { Rol } from '@ai27-tech/contracts/roles';
import type { EstadoEmergencia, Reclamo } from '@/lib/contracts/emergencias';
import { esTerminal } from '@/lib/contracts/viajeDetalle';
import { MATRIZ, puede } from '@/lib/permisos';

/** Vista mínima del caso que necesitan las afordancias. */
export interface CasoParaAfordancias {
  estado: EstadoEmergencia;
  reclamo_activo?: Reclamo | null;
}

/** Reclamar: solo Reacción, sobre un caso `abierta` sin responsable. */
export function puedeReclamar(rol: Rol | null, caso: CasoParaAfordancias): boolean {
  return puede(rol, 'emergencia.reclamar') && caso.estado === 'abierta' && !caso.reclamo_activo;
}

/** Devolver al pool: el responsable vigente, o supervisor/coordinador sobre cualquier caso. */
export function puedeDevolver(
  rol: Rol | null,
  caso: CasoParaAfordancias,
  sujetoId: string,
): boolean {
  if (caso.estado !== 'en_atencion' || !caso.reclamo_activo) return false;
  if (!puede(rol, 'emergencia.devolver')) return false;
  return caso.reclamo_activo.responsable_id === sujetoId || puede(rol, 'emergencia.gestionarAjeno');
}

/** Resolver: solo Reacción y solo el responsable vigente. */
export function puedeResolver(
  rol: Rol | null,
  caso: CasoParaAfordancias,
  sujetoId: string,
): boolean {
  return (
    puede(rol, 'emergencia.resolver') &&
    caso.estado === 'en_atencion' &&
    caso.reclamo_activo?.responsable_id === sujetoId
  );
}

/** Cerrar: caso ya `resuelta`, para monitoreo o administrador (nunca Reacción ni ejecutivo). */
export function puedeCerrar(rol: Rol | null, caso: CasoParaAfordancias): boolean {
  return caso.estado === 'resuelta' && puede(rol, 'emergencia.cerrar');
}

/**
 * Activar: monitoreo y administrador, sobre un viaje no terminal. Los terminales
 * salen de `esTerminal` del paquete generado; no se copia la lista.
 */
export function puedeActivar(rol: Rol | null, estadoViaje: string): boolean {
  const estadoTipado = estadoViaje as Parameters<typeof esTerminal>[0];
  return puede(rol, 'emergencia.activar') && !esTerminal(estadoTipado);
}

/** Anotar: monitoreo y administrador, mientras el caso no esté `cerrada`. */
export function puedeAnotar(rol: Rol | null, caso: CasoParaAfordancias): boolean {
  return puede(rol, 'emergencia.anotar') && caso.estado !== 'cerrada';
}

/**
 * Roles que ven el carril de emergencias del viaje. Adaptador sobre la política
 * (se retira cuando los consumidores usen `puede`, M9).
 */
export const ROLES_CON_CARRIL: readonly Rol[] = MATRIZ['emergencia.verDeViaje'];

/** El botón de activar vive en la cabecera del detalle: se muestra si el rol puede y el viaje no es terminal. */
export function puedeMostrarActivacion(rol: Rol | null, estadoViaje: string): boolean {
  return puede(rol, 'emergencia.verDeViaje') && puedeActivar(rol, estadoViaje);
}
