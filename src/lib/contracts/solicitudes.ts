/*
 * Contrato de solicitudes (M14, tracer.47, generado).
 *
 * Los tipos del wire salen de `@ai27-tech/contracts`; aquí solo se nombran. El Jefe Operativo
 * recibe la solicitud sin `cotizacion` ni `pago`: la UI trata `null` o ausencia como "oculto",
 * nunca como "sin cotizar" (DEC-148 #67).
 */
import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

export type Solicitud = Schemas['Solicitud'];
export type PaginaSolicitudes = Schemas['PaginaSolicitudes'];
export type EstadoSolicitud = Schemas['EstadoSolicitud'];
export type Cotizacion = Schemas['Cotizacion'];
export type Pago = Schemas['Pago'];
export type HistoricoSolicitud = Schemas['HistoricoSolicitud'];
export type HistoricoSolicitudItem = Schemas['HistoricoSolicitudItem'];
export type CotizacionEntrada = Schemas['CotizacionEntrada'];
export type ReprogramacionEntrada = Schemas['ReprogramacionEntrada'];
export type PagoEntrada = Schemas['PagoEntrada'];
export type MotivoEntrada = Schemas['MotivoEntrada'];

/**
 * Todos los estados de la solicitud, tal como los publica el paquete (ADR 38). El `Record` de
 * etiquetas obliga a cubrir cada uno.
 */
export { ESTADOS_SOLICITUD } from '@ai27-tech/contracts/estados/solicitud';
