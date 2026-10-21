/*
 * Modelo de vista del viaje. Adaptación de ViajeResumen del wire a la forma
 * que consume la presentación.
 *
 * Nota V1: ViajeResumen (listado de la bandeja) es { id, estado, origen },
 * sin condiciones activas. En cambio, ViajeDetalle (detalle individual, E8-T8)
 * incluye condiciones_activas en el contrato generado (tracer.13).
 *
 * El estado se preserva como token literal (string) tal cual lo devuelve bff,
 * sin derivar ni normalizar. La tipificación estricta (EstadoViaje enum) vive
 * en el contrato; aquí preservamos la forma del wire.
 */

import type { ViajeResumen, PaginaViajesResumen, CondicionViaje } from '@/lib/contracts/viajes';

/** Modelo de vista: resumen de viaje con estado y condiciones. */
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
   * Nota V1: En el listado (ViajeResumen), el bff no las entrega.
   * En el detalle individual (ViajeDetalle, E8-T8), están incluidas en el contrato generado.
   * El campo se modela como opcional; se descomenta en `adaptarItem` cuando
   * el listado las publique. La presentación (filaViaje) ya lo consume (P15, Req 2.5).
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
