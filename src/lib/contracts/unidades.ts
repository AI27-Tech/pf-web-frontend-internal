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

/** Alta de unidad: vehículo y 1 o 2 custodios; el `tipo` lo deriva el servidor (tracer.39). */
export type UnidadEntrada = Schemas['UnidadEntrada'];

/** Edición de unidad: todo opcional; activar o desactivar es cambiar `activa` (tracer.39). */
export type UnidadModificacion = Schemas['UnidadModificacion'];

/** Escolta vigente de un viaje con sus unidades legibles (`obtenerAsignacion`, tracer.39). */
export type EscoltaVigente = Schemas['EscoltaVigente'];
