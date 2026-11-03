import type {
  Cliente,
  EnviarMensajeInternaEntrada,
  PaginaClientes,
  PaginaMensajes,
  ReciboEntrada,
  Reclamo,
  TrabajoBandeja,
  VersionEsperadaEntrada,
  Conversacion,
  Mensaje,
} from '../contracts/conversaciones';
import { ApiError } from './errors';
import { request } from './client';
import { TEXTOS_ERROR_CONVERSACIONES as TEXTOS } from './conversacionesTextos';

/*
 * Cada clase lleva en `message` el texto que ve el usuario (centralizado en
 * `conversacionesTextos.ts`). La interfaz muestra `error.message` y no depende
 * de la cadena técnica del cliente HTTP.
 */
export class ErrorConflictoVersionReclamo extends ApiError {
  constructor() {
    super('conflicto', TEXTOS.conflictoVersionReclamo, 409, 'conflicto_version_reclamo');
    this.name = 'ErrorConflictoVersionReclamo';
  }
}
export class ErrorConversacionSoloLectura extends ApiError {
  constructor() {
    super('conflicto', TEXTOS.soloLectura, 409, 'conversacion_solo_lectura');
    this.name = 'ErrorConversacionSoloLectura';
  }
}
export class ErrorResyncRequerido extends ApiError {
  constructor() {
    super('conflicto', TEXTOS.resyncRequerido, 409, 'stream_resync_required');
    this.name = 'ErrorResyncRequerido';
  }
}
export class ErrorSinBandeja extends ApiError {
  constructor() {
    super('noEncontrado', TEXTOS.sinBandeja, 404);
    this.name = 'ErrorSinBandeja';
  }
}
export class ErrorSinAcceso extends ApiError {
  constructor() {
    super('noAutorizado', TEXTOS.sinAcceso, 403);
    this.name = 'ErrorSinAcceso';
  }
}
export class ErrorNoEsResponsable extends ApiError {
  constructor() {
    super('noAutorizado', TEXTOS.soloResponsable, 403);
    this.name = 'ErrorNoEsResponsable';
  }
}
/** 403 en envío, reclamo o lectura de una conversación (Req 4.6, 9.6). */
export class ErrorAutorizacionInsuficiente extends ApiError {
  constructor() {
    super('noAutorizado', TEXTOS.autorizacionInsuficiente, 403);
    this.name = 'ErrorAutorizacionInsuficiente';
  }
}
/** 404 de una conversación: no distingue inexistente de sin acceso (Req 2.7). */
export class ErrorConversacionNoDisponible extends ApiError {
  constructor() {
    super('noEncontrado', TEXTOS.conversacionNoDisponible, 404);
    this.name = 'ErrorConversacionNoDisponible';
  }
}
/** 5xx, caída de red o respuesta no interpretable: error recuperable con reintento (Req 12.2). */
export class ErrorServicioNoDisponible extends ApiError {
  constructor(status?: number, codigo?: string) {
    super(
      status !== undefined && status >= 500 ? 'degradado' : 'red',
      TEXTOS.servicioNoDisponible,
      status,
      codigo,
    );
    this.name = 'ErrorServicioNoDisponible';
  }
}

/**
 * Traduce un fallo del cliente HTTP a la clase de error de la bandeja.
 * - `bandeja`: lectura de la bandeja (403 sin membresía, 404 sin bandeja).
 * - `responsable`: acciones reservadas al responsable activo (liberar, atendida).
 * El `401` y la sesión finalizada no se tocan: los resuelve el flujo de sesión.
 */
function clasificar(error: unknown, action?: 'bandeja' | 'responsable'): never {
  if (!(error instanceof ApiError)) throw error;
  if (error.status === 401 || error.kind === 'sesionFinalizada') throw error;
  if (error.status === 404)
    throw action === 'bandeja' ? new ErrorSinBandeja() : new ErrorConversacionNoDisponible();
  if (error.status === 403) {
    if (action === 'bandeja') throw new ErrorSinAcceso();
    throw action === 'responsable'
      ? new ErrorNoEsResponsable()
      : new ErrorAutorizacionInsuficiente();
  }
  if (error.status === 409) {
    if (error.codigo === 'conversacion_solo_lectura') throw new ErrorConversacionSoloLectura();
    if (error.codigo === 'stream_resync_required') throw new ErrorResyncRequerido();
    // Versión obsoleta o sin reclamo activo en liberar/atendida (Req 8.4).
    if (error.codigo === 'conflicto_version_reclamo' || action === 'responsable')
      throw new ErrorConflictoVersionReclamo();
  }
  throw new ErrorServicioNoDisponible(error.status, error.codigo);
}

export async function listarTrabajoBandeja(
  token: string,
  desdeRevision?: number,
  cursor?: string,
): Promise<TrabajoBandeja> {
  const params = new URLSearchParams();
  if (cursor !== undefined) params.set('cursor', cursor);
  if (desdeRevision !== undefined) params.set('desde_revision', String(desdeRevision));
  try {
    return await request<TrabajoBandeja>(`/bandeja/trabajo${params.size ? `?${params}` : ''}`, {
      accessToken: token,
    });
  } catch (error) {
    clasificar(error, 'bandeja');
  }
}
export async function obtenerConversacion(id: string, token: string): Promise<Conversacion> {
  try {
    return await request<Conversacion>(`/conversaciones/${id}`, { accessToken: token });
  } catch (error) {
    clasificar(error);
  }
}
export async function listarMensajes(
  id: string,
  token: string,
  params: { antesDe?: number; despuesDe?: number; limite?: number } = {},
): Promise<PaginaMensajes> {
  const query = new URLSearchParams();
  if (params.antesDe !== undefined) query.set('antes_de', String(params.antesDe));
  if (params.despuesDe !== undefined) query.set('despues_de', String(params.despuesDe));
  if (params.limite !== undefined) query.set('limite', String(params.limite));
  try {
    return await request<PaginaMensajes>(
      `/conversaciones/${id}/mensajes${query.size ? `?${query}` : ''}`,
      { accessToken: token },
    );
  } catch (error) {
    clasificar(error);
  }
}
export async function enviarMensaje(
  id: string,
  entrada: EnviarMensajeInternaEntrada,
  token: string,
): Promise<Mensaje> {
  try {
    return await request<Mensaje>(`/conversaciones/${id}/mensajes`, {
      method: 'POST',
      body: entrada,
      accessToken: token,
    });
  } catch (error) {
    clasificar(error);
  }
}
export async function reclamarConversacion(
  id: string,
  entrada: VersionEsperadaEntrada,
  token: string,
): Promise<Reclamo> {
  try {
    return await request<Reclamo>(`/conversaciones/${id}/reclamos`, {
      method: 'POST',
      body: entrada,
      accessToken: token,
    });
  } catch (error) {
    clasificar(error);
  }
}
export async function liberarReclamo(
  id: string,
  reclamoId: string,
  version: number,
  token: string,
): Promise<void> {
  try {
    await request(`/conversaciones/${id}/reclamos/${reclamoId}?version_esperada=${version}`, {
      method: 'DELETE',
      accessToken: token,
    });
  } catch (error) {
    clasificar(error, 'responsable');
  }
}
export async function marcarAtendida(
  id: string,
  entrada: VersionEsperadaEntrada,
  token: string,
): Promise<void> {
  try {
    await request(`/conversaciones/${id}/atendida`, {
      method: 'POST',
      body: entrada,
      accessToken: token,
    });
  } catch (error) {
    clasificar(error, 'responsable');
  }
}
export async function registrarReciboLeido(
  id: string,
  entrada: ReciboEntrada,
  token: string,
): Promise<void> {
  try {
    await request(`/conversaciones/${id}/recibos/leido`, {
      method: 'POST',
      body: entrada,
      accessToken: token,
    });
  } catch (error) {
    clasificar(error, 'responsable');
  }
}
export async function listarClientes(token: string, cursor?: string): Promise<PaginaClientes> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return request<PaginaClientes>(`/clientes${query}`, { accessToken: token });
}
export type ClienteWire = Cliente;
