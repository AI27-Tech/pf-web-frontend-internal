/*
 * Contrato del roster de unidades (E8-T10, generado).
 *
 * La brecha quedó CERRADA en tracer.18: el `bff` proyecta `listarUnidades`
 * (`GET /api/v1/unidades`) como espejo de `operacion`. Estos tipos se derivan
 * del OpenAPI generado y ya no son locales. La lista del roster NO expone
 * aptitud; solo el resultado de asignar (`Asignacion`) la trae como dato.
 */

import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

/** Unidad completa del roster: vehículo y custodios pre-armados (generado). */
export type Unidad = Schemas['Unidad'];

/** Página del roster que expone el `bff` (generado). */
export type PaginaUnidades = Schemas['PaginaUnidades'];
