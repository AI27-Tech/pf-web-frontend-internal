/*
 * Modelo de vista del viaje. Adaptación de ViajeResumen del wire a la forma
 * que consume la presentación, aislando la brecha de condiciones activas.
 *
 * La brecha de V1: ViajeResumen del bff es { id, estado, origen }, sin condiciones.
 * El modelo de vista incluye un punto de integración `condiciones_activas?`
 * comentado; cuando el contrato entregue condiciones, se descomenta ahí.
 *
 * El estado se preserva como token literal (string) tal cual lo devuelve bff,
 * sin derivar ni normalizar. La tipificación estricta (EstadoViaje enum) vive
 * en el contrato; aquí preservamos la forma del wire.
 */

import type { ViajeResumen, PaginaViajesResumen, CondicionViaje } from '@/lib/contracts/viajes';

/** Modelo de vista: resumen de viaje con estado y condiciones (brecha aislada). */
export interface ViajeVista {
  /** Id único del viaje (procedencia: wire). */
  readonly id: string;

  /** Estado del viaje como token literal del bff, sin normalizar (procedencia: wire). */
  readonly estado: string;

  /** Origen del viaje (procedencia: wire). */
  readonly origen: string;

  /**
   * Condiciones activas del viaje (p. ej. INCIDENCIA, SIN_SENAL).
   *
   * BRECHA DE CONTRATO V1: el `ViajeResumen` del bff NO las trae hoy, así que
   * `adaptarItem` lo deja ausente. El campo se modela como opcional para que,
   * cuando el contrato las publique, el único cambio sea leerlas en `adaptarItem`
   * (punto de integración marcado ahí). La presentación (filaViaje) ya lo consume.
   * No se deriva ni se inventa en el frontend (P15, Requirement 2.5).
   */
  readonly condiciones_activas?: readonly CondicionViaje[];
}

/** Página de resúmenes de viajes (adaptación del wire). */
export interface PaginaViajesVista {
  /** Filas adaptadas de la página (preservan orden e índice del wire). */
  readonly filas: readonly ViajeVista[];

  /** Cursor para la siguiente página, o nulo si no hay más. */
  readonly cursorSiguiente: string | null;
}

/**
 * Adapta un ViajeResumen individual preservando el estado como token literal.
 * El estado no se normaliza; se guarda tal cual lo devuelve bff.
 */
export function adaptarItem(wire: ViajeResumen): ViajeVista {
  return {
    id: wire.id,
    estado: wire.estado,
    origen: wire.origen,
    // Punto de integración de condiciones activas (brecha V1):
    // condiciones_activas: wire.condiciones ?? [],
  };
}

/**
 * Adapta una página del wire, preservando orden e índice. No filtra,
 * no reordena; solo traduce la forma.
 */
export function adaptarPagina(wire: PaginaViajesResumen): PaginaViajesVista {
  return {
    filas: wire.items.map(adaptarItem),
    cursorSiguiente: wire.cursor_siguiente ?? null,
  };
}
