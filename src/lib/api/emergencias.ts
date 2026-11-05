/*
 * Wrapper de la bandeja de Reacción y del carril de emergencias del monitoreo.
 *
 * Operaciones de `bff` (tracer.37):
 *   GET    /panel/emergencias                              listarBandejaEmergencias
 *   GET    /panel/emergencias/{eid}                        obtenerEmergencia
 *   GET    /panel/emergencias/{eid}/notas                  listarNotasEmergenciaPorId
 *   POST   /panel/emergencias/{eid}/reclamos               reclamarEmergenciaPorId
 *   DELETE /panel/emergencias/{eid}/reclamos/{rid}         liberarReclamoEmergenciaPorId
 *   POST   /panel/emergencias/{eid}/resolucion             resolverEmergenciaPorId
 *   POST   /panel/emergencias/{eid}/cierre                 cerrarEmergenciaPorId
 *   GET    /panel/viajes/{id}/emergencias                  listarEmergenciasViaje
 *   POST   /panel/viajes/{id}/emergencias                  activarEmergenciaInterno
 *   POST   /panel/viajes/{id}/emergencias/{eid}/notas      agregarNotaEmergenciaInterno
 *
 * `transferirEmergenciaPorId` existe en el contrato pero queda fuera de V1 (DEC-134):
 * este wrapper no lo expone.
 */
import type {
  ActivarEmergenciaInternoEntrada,
  CasoEmergencia,
  DetalleEmergenciaReaccion,
  EmergenciaViaje,
  NotaEmergencia,
  NotaEmergenciaInternoEntrada,
  PaginaBandejaEmergencias,
  PaginaEmergenciasViaje,
  PaginaNotasEmergencia,
  Reclamo,
  ResolucionEmergenciaEntrada,
  VersionEsperadaEntrada,
} from '../contracts/emergencias';
import { ApiError } from './errors';
import { request } from './client';

/** La emergencia ya está cerrada y no admite la acción. Llega como 409 `emergencia_cerrada`. */
export class ErrorEmergenciaCerrada extends ApiError {
  constructor() {
    super('conflicto', 'La emergencia ya está cerrada.', 409, 'emergencia_cerrada');
    this.name = 'ErrorEmergenciaCerrada';
  }
}
/** El viaje ya está en estado terminal y no admite activar emergencias. */
export class ErrorViajeTerminal extends ApiError {
  constructor() {
    super(
      'conflicto',
      'El viaje ya está cerrado; no se puede activar una emergencia.',
      409,
      'viaje_en_estado_terminal',
    );
    this.name = 'ErrorViajeTerminal';
  }
}
/** Versión del reclamo obsoleta: el caso cambió. Se resuelve recargando, sin reintento silencioso. */
export class ErrorVersionReclamoEmergencia extends ApiError {
  constructor() {
    super(
      'conflicto',
      'El caso cambió mientras lo veías. Se recargó la información.',
      409,
      'conflicto_version_reclamo',
    );
    this.name = 'ErrorVersionReclamoEmergencia';
  }
}
/** 403 en la lectura de la bandeja o del caso: sin acceso a la superficie. */
export class ErrorSinAccesoEmergencias extends ApiError {
  constructor() {
    super('noAutorizado', 'No tienes acceso a las emergencias.', 403);
    this.name = 'ErrorSinAccesoEmergencias';
  }
}
/** 403 en una acción: el gesto no te corresponde (p. ej. no eres el responsable). */
export class ErrorAccionNoPermitida extends ApiError {
  constructor() {
    super('noAutorizado', 'No puedes realizar esta acción sobre la emergencia.', 403);
    this.name = 'ErrorAccionNoPermitida';
  }
}
/** 404: la bandeja o el caso no están disponibles para ti. No se distingue la causa. */
export class ErrorEmergenciaNoDisponible extends ApiError {
  constructor() {
    super('noEncontrado', 'La emergencia no está disponible.', 404);
    this.name = 'ErrorEmergenciaNoDisponible';
  }
}
/** 400 al resolver o anotar: la nota no cumple las validaciones. */
/** Sesión finalizada o 401: el flujo de sesión del AppShell lo resuelve, no la vista. */
export function esSesionFinalizada(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.kind === 'sesionFinalizada');
}
export class ErrorNotaInvalida extends ApiError {
  constructor() {
    super('red', 'La nota no es válida. Revisa el texto e inténtalo de nuevo.', 400);
    this.name = 'ErrorNotaInvalida';
  }
}
/** Fallo de red o 5xx: recuperable con reintento. */
export class ErrorEmergenciasNoDisponible extends ApiError {
  constructor(status?: number, codigo?: string) {
    super(
      status !== undefined && status >= 500 ? 'degradado' : 'red',
      'No se pudo completar la operación. Inténtalo de nuevo.',
      status,
      codigo,
    );
    this.name = 'ErrorEmergenciasNoDisponible';
  }
}

/** Contexto de la llamada: decide cómo se traduce un 403 o un 409 sin código. */
export type ContextoEmergencia = 'lectura' | 'accion' | 'bandeja' | 'activacion';

/**
 * Traduce el fallo del cliente HTTP a la clase de error de emergencias.
 * El `401` y la sesión finalizada se propagan: los resuelve el flujo de sesión.
 */
export function clasificarEmergencia(error: unknown, contexto: ContextoEmergencia): never {
  if (!(error instanceof ApiError)) throw error;
  if (error.status === 401 || error.kind === 'sesionFinalizada') throw error;
  if (error.status === 403)
    throw contexto === 'accion' ? new ErrorAccionNoPermitida() : new ErrorSinAccesoEmergencias();
  if (error.status === 404) throw new ErrorEmergenciaNoDisponible();
  if (error.status === 400) throw new ErrorNotaInvalida();
  if (error.status === 409) {
    if (error.codigo === 'emergencia_cerrada') throw new ErrorEmergenciaCerrada();
    if (error.codigo === 'viaje_en_estado_terminal') throw new ErrorViajeTerminal();
    if (error.codigo === 'conflicto_version_reclamo') throw new ErrorVersionReclamoEmergencia();
    // 409 sin código interpretable en una acción de reclamo: tratarlo como cambio de versión.
    if (contexto === 'accion') throw new ErrorVersionReclamoEmergencia();
  }
  throw new ErrorEmergenciasNoDisponible(error.status, error.codigo);
}

/* ---------- Bandeja de Reacción ---------- */

export async function listarBandejaEmergencias(
  token: string,
  cursor?: string,
): Promise<PaginaBandejaEmergencias> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  try {
    return await request<PaginaBandejaEmergencias>(`/panel/emergencias${query}`, {
      accessToken: token,
    });
  } catch (error) {
    clasificarEmergencia(error, 'bandeja');
  }
}

export async function obtenerEmergencia(
  eid: string,
  token: string,
): Promise<DetalleEmergenciaReaccion> {
  try {
    return await request<DetalleEmergenciaReaccion>(`/panel/emergencias/${eid}`, {
      accessToken: token,
    });
  } catch (error) {
    clasificarEmergencia(error, 'lectura');
  }
}

export async function listarNotasEmergencia(
  eid: string,
  token: string,
  cursor?: string,
): Promise<PaginaNotasEmergencia> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  try {
    return await request<PaginaNotasEmergencia>(`/panel/emergencias/${eid}/notas${query}`, {
      accessToken: token,
    });
  } catch (error) {
    clasificarEmergencia(error, 'lectura');
  }
}

export async function reclamarEmergencia(
  eid: string,
  entrada: VersionEsperadaEntrada,
  token: string,
): Promise<Reclamo> {
  try {
    return await request<Reclamo>(`/panel/emergencias/${eid}/reclamos`, {
      method: 'POST',
      body: entrada,
      accessToken: token,
    });
  } catch (error) {
    clasificarEmergencia(error, 'accion');
  }
}

export async function liberarReclamoEmergencia(
  eid: string,
  rid: string,
  versionEsperada: number,
  token: string,
): Promise<void> {
  try {
    await request(`/panel/emergencias/${eid}/reclamos/${rid}?version_esperada=${versionEsperada}`, {
      method: 'DELETE',
      accessToken: token,
    });
  } catch (error) {
    clasificarEmergencia(error, 'accion');
  }
}

export async function resolverEmergencia(
  eid: string,
  entrada: ResolucionEmergenciaEntrada,
  token: string,
): Promise<unknown> {
  try {
    return await request(`/panel/emergencias/${eid}/resolucion`, {
      method: 'POST',
      body: entrada,
      accessToken: token,
    });
  } catch (error) {
    clasificarEmergencia(error, 'accion');
  }
}

export async function cerrarEmergencia(eid: string, token: string): Promise<CasoEmergencia> {
  try {
    return await request<CasoEmergencia>(`/panel/emergencias/${eid}/cierre`, {
      method: 'POST',
      accessToken: token,
    });
  } catch (error) {
    clasificarEmergencia(error, 'accion');
  }
}

/* ---------- Carril del monitoreo por viaje (tracer.37, DEC-135) ---------- */

export async function listarEmergenciasViaje(
  viajeId: string,
  token: string,
): Promise<PaginaEmergenciasViaje> {
  try {
    return await request<PaginaEmergenciasViaje>(`/panel/viajes/${viajeId}/emergencias`, {
      accessToken: token,
    });
  } catch (error) {
    clasificarEmergencia(error, 'lectura');
  }
}

export async function activarEmergenciaInterno(
  viajeId: string,
  entrada: ActivarEmergenciaInternoEntrada,
  token: string,
): Promise<EmergenciaViaje> {
  try {
    // 201 (activación nueva) y 200 (reentrega de la misma `activacion_id`) son éxito para la UI.
    return await request<EmergenciaViaje>(`/panel/viajes/${viajeId}/emergencias`, {
      method: 'POST',
      body: entrada,
      accessToken: token,
    });
  } catch (error) {
    clasificarEmergencia(error, 'activacion');
  }
}

export async function agregarNotaEmergenciaInterno(
  viajeId: string,
  eid: string,
  entrada: NotaEmergenciaInternoEntrada,
  token: string,
): Promise<NotaEmergencia | undefined> {
  try {
    return await request<NotaEmergencia | undefined>(
      `/panel/viajes/${viajeId}/emergencias/${eid}/notas`,
      { method: 'POST', body: entrada, accessToken: token },
    );
  } catch (error) {
    clasificarEmergencia(error, 'accion');
  }
}
