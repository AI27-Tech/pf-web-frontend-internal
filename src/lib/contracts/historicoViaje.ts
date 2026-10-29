/*
 * Tipos de wire del histórico del viaje (E8-T13).
 *
 * Capa de aislamiento del contrato: re-exporta los schemas generados por
 * `@ai27-tech/contracts@0.1.0-tracer.22` (openapi del `bff`). El contrato
 * publica las ocho operaciones del histórico (incluida la lectura de
 * incidencias desde `tracer.22`) y todos sus schemas, así que esta capa NO
 * define formas a mano: solo nombra los tipos generados para que el resto del
 * código dependa de un único punto. Si el contrato cambia, cambia aquí.
 *
 * Catálogos (DEC-105): la bitácora es solo `{ texto }` (sin tipo de entrada) y
 * `tipo_interno` de incidencia es `string` en V1 (enum curado en ola posterior).
 * Los motivos y ejes de estadía sí son enums cerrados del contrato.
 */
import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

export type EntradaBitacoraEntrada = Schemas['EntradaBitacoraEntrada'];
export type EntradaBitacora = Schemas['EntradaBitacora'];
export type PaginaBitacora = Schemas['PaginaBitacora'];
export type IncidenciaEntrada = Schemas['IncidenciaEntrada'];
export type Incidencia = Schemas['Incidencia'];
export type PaginaIncidencias = Schemas['PaginaIncidencias'];
export type ResolucionIncidenciaEntrada = Schemas['ResolucionIncidenciaEntrada'];
export type MotivoEstadia = Schemas['MotivoEstadia'];
export type EjeAutorizacionEstadia = Schemas['EjeAutorizacionEstadia'];
export type Estadia = Schemas['Estadia'];
export type EstadiaEntrada = Schemas['EstadiaEntrada'];
export type CierreEstadiaEntrada = Schemas['CierreEstadiaEntrada'];
export type PaginaEstadias = Schemas['PaginaEstadias'];

/** Motivos de estadía del contrato, para poblar el selector sin inventar valores. */
export const MOTIVOS_ESTADIA: readonly MotivoEstadia[] = [
  'combustible',
  'descanso',
  'alimentos',
  'sanitario',
  'reten',
  'revision_autoridades',
  'gastos',
  'espera_entrega',
];

/** Ejes de autorización de estadía del contrato, para el selector. */
export const EJES_AUTORIZACION_ESTADIA: readonly EjeAutorizacionEstadia[] = [
  'autorizada',
  'no_autorizada',
  'antes_200km',
];
