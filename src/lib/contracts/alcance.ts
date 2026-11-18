/*
 * Contrato del alcance de monitoreo que usa /roster (E8-T21, tracer.40, generado).
 *
 * Solo lo que necesita "mis unidades" de cada Monitorista (DEC-140 #1, DEC-142 #2):
 * listar Monitoristas, leer su alcance y fijar sus unidades. La administración
 * completa de usuarios (E8-T19) tiene su propio módulo.
 */

import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

/** Usuario como lo compone el `bff`; `nombre` e `identificador_usuario` son opcionales. */
export type UsuarioAdmin = Schemas['UsuarioAdmin'];

export type PaginaUsuariosAdmin = Schemas['PaginaUsuariosAdmin'];

/** Unidades propias, subordinados y unidades efectivas de un usuario (DEC-140). */
export type AlcanceSujeto = Schemas['AlcanceSujeto'];

/** Conjunto completo de unidades del Monitorista; reemplaza al anterior. */
export type UnidadesSujetoEntrada = Schemas['UnidadesSujetoEntrada'];
