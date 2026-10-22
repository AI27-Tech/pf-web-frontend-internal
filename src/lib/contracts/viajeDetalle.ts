/*
 * Contrato de detalle del viaje — capa única de acoplamiento con el contrato.
 *
 * Este archivo es el único punto donde el resto del código toca el contrato: los
 * demás módulos importan estos alias, no el paquete generado directamente. Todos
 * los endpoints internos del viaje están publicados en
 * `@ai27-tech/contracts@0.1.0-tracer.15` y sus tipos se derivan del OpenAPI
 * generado (`@ai27-tech/contracts/openapi/bff`); no se replican a mano:
 *   GET   /api/v1/viajes/{id}/detalle      → ViajeDetalle (operationId: obtenerViajeInterno)
 *   POST  /api/v1/viajes/{id}/transiciones → ViajeDetalle (entrada: TransicionEntrada)
 *   PATCH /api/v1/viajes/{id}/eta          → ViajeDetalle (entrada: EtaEntrada)
 *   PATCH /api/v1/viajes/{id}/fecha-hora   → ViajeDetalle (entrada: FechaHoraEntrada)
 *
 * La brecha de escritura de `fecha_hora_servicio` (E8-T9) quedó CERRADA en
 * tracer.15: `FechaHoraEntrada` ya es un tipo generado y `completarFechaHora` es
 * una operación real del `bff`.
 */

import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

/**
 * Detalle interno del viaje con estado canónico (generado, tracer.15).
 *
 * Contiene:
 * - `viaje`: objeto con id, estado, origen (string), destinos[], eta_estimado?
 * - `condiciones_activas[]`: lista de condiciones ortogonales (INCIDENCIA, SIN_SENAL)
 *
 * Punto de entrada: GET /api/v1/viajes/{id}/detalle
 */
export type ViajeDetalle = Schemas['ViajeDetalle'];

/** Viaje con estado canónico, tal como lo expone el BFF (generado). */
export type ViajeInterno = Schemas['ViajeInterno'];

/** Condición ortogonal abierta, independiente del progreso del viaje (generado). */
export type CondicionAbierta = Schemas['CondicionAbierta'];

/**
 * Entrada para solicitar una transición de estado (generado).
 *
 * Punto de entrada: POST /api/v1/viajes/{id}/transiciones
 */
export type TransicionEntrada = Schemas['TransicionEntrada'];

/**
 * Entrada para fijar el ETA manual (generado).
 *
 * Punto de entrada: PATCH /api/v1/viajes/{id}/eta
 */
export type EtaEntrada = Schemas['EtaEntrada'];

/**
 * Entrada para completar/editar la fecha y hora del servicio (E8-T9, generado).
 *
 * `{ fecha_hora_servicio: MarcaTiempo }`. Escribe la fecha/hora sobre un viaje
 * existente (guarda de aprobación, E1-HU-003 / DEC-010 #2). Publicado en
 * tracer.15; antes era un tipo local que cubría la brecha de contrato.
 *
 * Punto de entrada: PATCH /api/v1/viajes/{id}/fecha-hora (operationId: completarFechaHora)
 */
export type FechaHoraEntrada = Schemas['FechaHoraEntrada'];

/**
 * Enum de estados del viaje (procedencia: `@ai27-tech/contracts/estados`).
 *
 * Objeto const-as-data: a la vez VALOR y TIPO. Se reexporta del contrato
 * generado (ADR 19).
 */
export { EstadoViaje } from '@ai27-tech/contracts/estados';

/**
 * Tabla de transiciones válidas del viaje (procedencia: `@ai27-tech/contracts/estados`).
 *
 * Estructura: aristas de la máquina de estados, donde cada arista es:
 *   { desde: EstadoViaje, hacia: EstadoViaje, requiereMotivo?: boolean }
 *
 * Se reexporta del contrato generado.
 */
export { TRANSICIONES_VIAJE } from '@ai27-tech/contracts/estados';

/**
 * Función de validación de transición.
 *
 * Signature: `puedeTransicionar(estado_origen, estado_destino) => boolean`
 *
 * Usado para:
 * - Derivar acciones ofrecidas (filtrar TRANSICIONES_VIAJE por origen)
 * - Validar en el mock (antes de responder 409)
 *
 * Se reexporta del contrato generado.
 */
export { puedeTransicionar } from '@ai27-tech/contracts/estados';

/**
 * Función que determina si un estado es terminal.
 *
 * Signature: `esTerminal(estado) => boolean`
 *
 * Estados terminales: RECHAZADO_POR_AI27, RECHAZADO_POR_CLIENTE, CERRADO, CANCELADO.
 *
 * Usado para:
 * - No ofrecer acciones si el viaje está terminal
 * - No permitir ETA en viaje terminal
 *
 * Se reexporta del contrato generado.
 */
export { esTerminal } from '@ai27-tech/contracts/estados';
