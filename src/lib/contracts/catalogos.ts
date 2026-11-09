/*
 * Contrato de vehículos y custodios de `/catalogos` (adelanto de E8-T16, DEC-142 #6).
 *
 * Generado desde el `bff` de tracer.39, espejo de `catalogos`. La flota es de AI27:
 * el vehículo no lleva cliente (DEC-143). Vehículo usa `activa|inactiva` y custodio
 * `activo|inactivo`, como en `catalogos`.
 */

import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

export type Vehiculo = Schemas['Vehiculo'];
export type VehiculoEntrada = Schemas['VehiculoEntrada'];
export type VehiculoCambios = Schemas['VehiculoCambios'];
export type PaginaVehiculos = Schemas['PaginaVehiculos'];

export type Custodio = Schemas['Custodio'];
export type CustodioEntrada = Schemas['CustodioEntrada'];
export type CustodioCambios = Schemas['CustodioCambios'];
export type PaginaCustodios = Schemas['PaginaCustodios'];
