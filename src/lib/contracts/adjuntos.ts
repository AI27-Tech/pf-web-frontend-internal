import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

/** Metadatos de un adjunto del viaje. No incluye los bytes. */
export type Adjunto = Schemas['Adjunto'];

/** Página de adjuntos que devuelve `listarAdjuntos`. */
export type PaginaAdjuntos = Schemas['PaginaAdjuntos'];

/** Cuerpo de `crearIntencionSubidaAdjunto`. */
export type IntencionSubidaAdjuntoEntrada = Schemas['IntencionSubidaAdjuntoEntrada'];

/** Respuesta de la intención de subida: id del adjunto y URL de vida corta. */
export type IntencionSubidaAdjunto = Schemas['IntencionSubidaAdjunto'];

/** Respuesta de `descargarAdjunto`: URL de vida corta del almacenamiento. */
export type DescargaAdjunto = Schemas['DescargaAdjunto'];

/** Estado del escaneo antivirus, tal como lo declara el contrato. */
export type EstadoEscaneo = Adjunto['estado_escaneo'];
