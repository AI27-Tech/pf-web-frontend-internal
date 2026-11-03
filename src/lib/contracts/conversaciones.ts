import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

export type Conversacion = Schemas['Conversacion'];
export type Reclamo = Schemas['Reclamo'];
export type Mensaje = Schemas['Mensaje'];
export type TrabajoBandeja = Schemas['TrabajoBandeja'];
export type PaginaMensajes = Schemas['PaginaMensajes'];
export type EnviarMensajeInternaEntrada = Schemas['EnviarMensajeInternaEntrada'];
export type VersionEsperadaEntrada = Schemas['VersionEsperadaEntrada'];
export type ReciboEntrada = Schemas['ReciboEntrada'];
export type Cliente = Schemas['Cliente'];
export type PaginaClientes = Schemas['PaginaClientes'];
