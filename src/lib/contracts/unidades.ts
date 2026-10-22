/*
 * Contrato esperado del roster de unidades (E8-T10).
 *
 * La operación existe en `operacion`, pero el BFF todavía no la publica para
 * este frontend. Estos tipos son la brecha aislada que se reemplazará cuando
 * el BFF exponga sus schemas generados. La lista no contiene aptitud: solo el
 * resultado de asignar una unidad puede traerla como dato informativo.
 */

/** Unidad completa del roster: vehículo y custodios pre-armados. */
export interface Unidad {
  readonly id: string;
  readonly vehiculo_id: string;
  readonly custodios_ids: string[];
  readonly tipo: 'patrulla' | 'moto';
  readonly activa: boolean;
}

/** Página del roster esperada por el BFF. */
export interface PaginaUnidades {
  readonly items: Unidad[];
  readonly cursor_siguiente: string | null;
}
