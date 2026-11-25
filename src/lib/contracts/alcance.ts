/*
 * Contrato del alcance de monitoreo que usa /roster (E8-T21, tracer.40, generado).
 *
 * Solo lo que necesita "mis clientes" de cada Monitorista (DEC-149 #18):
 * listar Monitoristas, leer su alcance y fijar sus clientes. La administración
 * completa de usuarios (E8-T19) tiene su propio módulo.
 */

import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

/** Usuario como lo compone el `bff`; `nombre` e `identificador_usuario` son opcionales. */
export type UsuarioAdmin = Schemas['UsuarioAdmin'];

export type PaginaUsuariosAdmin = Schemas['PaginaUsuariosAdmin'];

/**
 * Alcance del propio usuario (obtenerMiAlcance, DEC-149 #24): solo los clientes efectivos.
 * Lo leen monitorista, supervisor y coordinador; otro rol recibe 403.
 */
export type MiAlcance = Schemas['MiAlcance'];

/** Clientes propios y efectivos, subordinados y unidades de un usuario (DEC-149 #18). */
export type AlcanceSujeto = Schemas['AlcanceSujeto'];

/** Conjunto completo de clientes del Monitorista; reemplaza al anterior. */
export type ClientesSujetoEntrada = Schemas['ClientesSujetoEntrada'];
