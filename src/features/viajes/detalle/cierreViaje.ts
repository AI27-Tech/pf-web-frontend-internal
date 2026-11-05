import type { Rol } from '@ai27-tech/contracts/roles';

import type { MotivoCierre } from '@/lib/contracts/cierreViaje';
import type { CondicionAbierta } from '@/lib/contracts/viajeDetalle';
import { EstadoViaje } from '@/lib/contracts/viajeDetalle';

import { accionesDesde } from './accionesTransicion';

export type TipoCierre = 'normal' | 'anticipado';

/** Solo estos roles tienen la facultad de cierre en V1 (DEC-060 #1). */
export function puedeCerrar(rol: Rol): boolean {
  return rol === 'jefe_operativo' || rol === 'administrador';
}

/**
 * Deriva el tipo desde la máquina contractual, sin duplicar sus aristas.
 * EN_TRANSITO representa el cierre anticipado; EN_DESTINO y EN_DESCARGA,
 * el cierre normal (DEC-020 #6, DEC-030, DEC-041, DEC-113).
 */
export function tipoDeCierre(estado: EstadoViaje): TipoCierre | null {
  if (!accionesDesde(estado).includes(EstadoViaje.Cerrado)) return null;
  return estado === EstadoViaje.EnTransito ? 'anticipado' : 'normal';
}

/**
 * Devuelve la razón visible por la que no puede intentarse un cierre
 * anticipado, o null si las condiciones actuales permiten intentarlo (DEC-113).
 */
export function bloqueoDeCierre(
  estado: EstadoViaje,
  condiciones: readonly CondicionAbierta[],
): string | null {
  if (tipoDeCierre(estado) !== 'anticipado') return null;

  const tieneIncidenciaAbierta = condiciones.some((condicion) => condicion.tipo === 'INCIDENCIA');
  return tieneIncidenciaAbierta
    ? null
    : 'El cierre anticipado solo es válido con una incidencia abierta';
}

/** Motivos que corresponden al tipo de cierre derivado de la máquina. */
export function motivosPermitidos(tipo: TipoCierre): readonly MotivoCierre[] {
  return tipo === 'anticipado' ? ['por_incidencia'] : ['normal', 'por_incidencia'];
}

/**
 * Regla de escritura de la conversación (DEC-030, DEC-041).
 * Devuelve una duración comunicable, nunca una fecha calculada.
 */
const VENTANA_ESCRITURA: Record<MotivoCierre, string> = {
  normal: '3 días',
  por_incidencia: '6 meses',
};

export function ventanaDeEscritura(motivo: MotivoCierre): string {
  return VENTANA_ESCRITURA[motivo];
}

/**
 * Redacción de la ventana en el aviso de cierre exitoso (texto aprobado por
 * Producto, 2026-10-30, fila 1 de C6). El "más" solo aclara que el plazo corre
 * desde el cierre; la regla es la misma de `ventanaDeEscritura`. Nunca es una fecha.
 */
const VENTANA_TRAS_CIERRE: Record<MotivoCierre, string> = {
  normal: '3 días más',
  por_incidencia: '6 meses',
};

export function ventanaTrasCierre(motivo: MotivoCierre): string {
  return VENTANA_TRAS_CIERRE[motivo];
}
