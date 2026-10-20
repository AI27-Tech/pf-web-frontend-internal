/*
 * Contrato de viajes — consumido desde `@ai27-tech/contracts`.
 *
 * Los tipos del wire (`ViajeResumen`, `PaginaViajesResumen`) vienen del
 * paquete generado desde el contrato OpenAPI del BFF, no escritos a mano.
 *
 * Los enums de dominio (`EstadoViaje`, `CondicionViaje`) vienen del paquete
 * de estados generado; `ESTADOS_VIAJE` es el enum normalizado.
 */

import type { components } from '@ai27-tech/contracts/openapi/bff';

/** Forma del wire generada por el contrato: resumen de un viaje individual. */
export type ViajeResumen = components['schemas']['ViajeResumen'];

/** Forma del wire generada por el contrato: página de resúmenes de viajes. */
export type PaginaViajesResumen = components['schemas']['PaginaViajesResumen'];

/**
 * Enum de estados del viaje (procedencia: `@ai27-tech/contracts/estados`).
 *
 * Objeto const-as-data: a la vez VALOR (`{ Solicitado, EnTransito, … }`) y TIPO
 * (union de los tokens de ADR 19). Se reexporta tal cual del contrato.
 */
export { EstadoViaje } from '@ai27-tech/contracts/estados';

/** Lista de estados declarados del viaje (ADR 19); puebla las opciones del filtro. */
export { ESTADOS_VIAJE } from '@ai27-tech/contracts/estados';

/**
 * Enum de condiciones ortogonales del viaje (procedencia: `@ai27-tech/contracts/estados`).
 *
 * Objeto const-as-data: a la vez VALOR (`{ Incidencia, SinSenal }`, para construir
 * el mapa de variantes de presentación cubriendo el enum completo) y TIPO
 * (`"INCIDENCIA" | "SIN_SENAL"`, para tipar `condiciones_activas`). No se definen
 * condiciones en el frontend (P15); se reexporta tal cual del contrato.
 */
export { CondicionViaje } from '@ai27-tech/contracts/estados';
