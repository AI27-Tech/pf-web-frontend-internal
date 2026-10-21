/**
 * Determinación de qué transiciones requieren una causa (motivo).
 *
 * Módulo puro. El contrato generado (`@ai27-tech/contracts/estados`) NO expone
 * metadato de "requiere causa" por arista: solo publica las aristas permitidas.
 * Por eso la regla vive aquí, declarada explícitamente y derivada de las
 * decisiones de dominio:
 *
 * - DEC-020 #2 / Req 2.5: los rechazos exigen motivo.
 * - E8-T9: rechazar una solicitud exige motivo obligatorio.
 * - Una cancelación deja constancia de por qué se abortó el viaje.
 *
 * Si en el futuro el contrato publica este metadato por arista, este módulo se
 * reemplaza por esa fuente generada (punto único de cambio, igual que la brecha
 * de contrato de `lib/contracts/viajeDetalle.ts`).
 */

import { EstadoViaje, type EstadoViaje as TEstadoViaje } from '@/lib/contracts/viajeDetalle';

/**
 * Estados destino cuya transición exige una causa obligatoria. La causa explica
 * el porqué del rechazo o la cancelación y queda en el histórico (actor + marca
 * de tiempo los añade `operacion`).
 */
const DESTINOS_QUE_REQUIEREN_CAUSA: ReadonlySet<TEstadoViaje> = new Set([
  EstadoViaje.RechazadoPorAi27,
  EstadoViaje.RechazadoPorCliente,
  EstadoViaje.Cancelado,
]);

/**
 * Indica si transicionar al estado destino dado exige capturar una causa antes
 * de enviar la transición (Req 2.5).
 *
 * @param destino Estado destino de la transición (`EstadoViaje`).
 * @returns `true` si el destino requiere causa obligatoria.
 */
export function requiereCausa(destino: TEstadoViaje): boolean {
  return DESTINOS_QUE_REQUIEREN_CAUSA.has(destino);
}
