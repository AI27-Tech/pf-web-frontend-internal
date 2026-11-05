import type { components } from '@ai27-tech/contracts/openapi/bff';

import { EstadoViaje, type TransicionEntrada } from './viajeDetalle';

/** Motivo de cierre generado por el contrato (DEC-113). */
export type MotivoCierre = components['schemas']['MotivoCierre'];

/** Catálogo contractual completo de motivos de cierre de V1. */
export const MOTIVOS_CIERRE: readonly MotivoCierre[] = ['normal', 'por_incidencia'] as const;

/**
 * Construye la entrada contractual para cerrar un viaje.
 * El motivo de cierre no se envía como `causa` ni junto con otro campo.
 */
export function entradaDeCierre(motivo: MotivoCierre): TransicionEntrada {
  return {
    a_estado: EstadoViaje.Cerrado,
    motivo_cierre: motivo,
  };
}
