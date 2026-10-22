/*
 * Contrato de detalle del viaje — capa única de acoplamiento con el contrato.
 *
 * Este archivo es el único punto donde el resto del código toca el contrato: los
 * demás módulos importan estos alias, no el paquete generado directamente. Aquí
 * conviven dos situaciones distintas que NO hay que confundir:
 *
 * 1. LECTURA Y TRANSICIÓN — brecha CERRADA. Estos endpoints ya están publicados
 *    en `@ai27-tech/contracts@0.1.0-tracer.13` y sus tipos se derivan del OpenAPI
 *    generado (`@ai27-tech/contracts/openapi/bff`); no se replican a mano:
 *      GET   /api/v1/viajes/{id}/detalle      → ViajeDetalle (operationId: obtenerViajeInterno)
 *      POST  /api/v1/viajes/{id}/transiciones → ViajeDetalle (entrada: TransicionEntrada)
 *      PATCH /api/v1/viajes/{id}/eta          → ViajeDetalle (entrada: EtaEntrada)
 *
 * 2. COMPLETAR FECHA/HORA (E8-T9) — brecha ABIERTA (Opción A). El contrato
 *    (tracer.13) expone `fecha_hora_servicio` SOLO de lectura; NO existe aún un
 *    endpoint de escritura. Mientras el `bff` no lo publique, la forma esperada
 *    vive aquí como `FechaHoraEntrada` y se sirve con mock (MSW). Ver el detalle
 *    y la nota de reemplazo mecánico en el bloque de `FechaHoraEntrada` abajo.
 */

import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

/**
 * Detalle interno del viaje con estado canónico (generado, tracer.13).
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
 * Entrada para completar/editar la fecha y hora del servicio (E8-T9).
 *
 * BRECHA DE CONTRATO ABIERTA (Opción A, BLOQUEANTE PARCIAL):
 * el contrato instalado (tracer.13) expone `fecha_hora_servicio` SOLO de lectura
 * en `ViajeInterno`. NO existe hoy un endpoint de escritura para completarla
 * sobre un viaje existente: `TransicionEntrada` no la lleva y en `operacion` el
 * campo solo entra en la creación (`ViajeEntrada`), no en edición.
 *
 * Mientras el `bff` no publique la operación, este tipo declara la FORMA
 * ESPERADA del cuerpo (`{ fecha_hora_servicio }`, ISO 8601 / `MarcaTiempo`),
 * servida por mock (MSW). Cuando el esquema se publique, se reemplaza por su
 * alias generado (`Schemas['FechaHoraEntrada']` o el nombre que defina el `bff`)
 * en este mismo punto, sin tocar el resto del código.
 *
 * Punto de entrada ESPERADO: PATCH /api/v1/viajes/{id}/fecha-hora
 */
export interface FechaHoraEntrada {
  /** Fecha y hora pactada del servicio (ISO 8601, `MarcaTiempo`). */
  readonly fecha_hora_servicio: string;
}

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
