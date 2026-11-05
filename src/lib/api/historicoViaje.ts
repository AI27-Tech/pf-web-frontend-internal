import type {
  CierreEstadiaEntrada,
  EntradaBitacora,
  EntradaBitacoraEntrada,
  Estadia,
  EstadiaEntrada,
  Incidencia,
  IncidenciaEntrada,
  PaginaBitacora,
  PaginaEstadias,
  PaginaIncidencias,
  ResolucionIncidenciaEntrada,
} from '../contracts/historicoViaje';
import { request } from './client';
import { ApiError } from './errors';

/** Códigos contractuales de conflictos del histórico del viaje. */
export type ConflictoCodigoHistorico = 'condicion_ya_abierta' | 'estadia_ya_cerrada';

/** Error cuando ya existe una condición abierta del mismo tipo. */
export class ErrorCondicionYaAbierta extends ApiError {
  override readonly codigo = 'condicion_ya_abierta' as const;

  constructor() {
    super(
      'conflicto',
      'Ya existe una condición abierta para este viaje.',
      409,
      'condicion_ya_abierta',
    );
    this.name = 'ErrorCondicionYaAbierta';
  }
}

/** Error cuando se intenta cerrar una estadía que ya estaba cerrada. */
export class ErrorEstadiaYaCerrada extends ApiError {
  override readonly codigo = 'estadia_ya_cerrada' as const;

  constructor() {
    super('conflicto', 'La estadía ya está cerrada.', 409, 'estadia_ya_cerrada');
    this.name = 'ErrorEstadiaYaCerrada';
  }
}

/** Error cuando el rol autenticado no puede ejecutar la corrección solicitada. */
export class ErrorAutorizacionInsuficiente extends ApiError {
  constructor() {
    super('noAutorizado', 'No tienes autorización suficiente para esta acción.', 403);
    this.name = 'ErrorAutorizacionInsuficiente';
  }
}

function clasificarErrorHistorico(error: unknown): never {
  if (!(error instanceof ApiError)) throw error;

  if (error.status === 403) throw new ErrorAutorizacionInsuficiente();
  if (error.status !== 409) throw error;

  if (error.codigo === 'condicion_ya_abierta') throw new ErrorCondicionYaAbierta();
  if (error.codigo === 'estadia_ya_cerrada') throw new ErrorEstadiaYaCerrada();

  throw error;
}

/** Lista una página de entradas append-only de la bitácora. */
export function listarBitacora(
  id: string,
  accessToken: string,
  cursor?: string,
): Promise<PaginaBitacora> {
  const query = cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`;
  return request<PaginaBitacora>(`/viajes/${id}/bitacora${query}`, { accessToken });
}

/** Registra una entrada append-only en la bitácora del viaje. */
export async function registrarEntradaBitacora(
  id: string,
  entrada: EntradaBitacoraEntrada,
  accessToken: string,
): Promise<EntradaBitacora> {
  try {
    return await request<EntradaBitacora>(`/viajes/${id}/bitacora`, {
      method: 'POST',
      body: entrada,
      accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      throw new ErrorAutorizacionInsuficiente();
    }
    throw error;
  }
}

/** Lista una página de incidencias del viaje (append-only, en_atencion y resuelta). */
export function listarIncidencias(
  id: string,
  accessToken: string,
  cursor?: string,
): Promise<PaginaIncidencias> {
  const query = cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`;
  return request<PaginaIncidencias>(`/viajes/${id}/incidencias${query}`, { accessToken });
}

/** Abre una incidencia operativa del viaje. */
export async function abrirIncidencia(
  id: string,
  entrada: IncidenciaEntrada,
  accessToken: string,
): Promise<Incidencia> {
  try {
    return await request<Incidencia>(`/viajes/${id}/incidencias`, {
      method: 'POST',
      body: entrada,
      accessToken,
    });
  } catch (error) {
    clasificarErrorHistorico(error);
  }
}

/** Resuelve una incidencia abierta del viaje. */
export async function resolverIncidencia(
  id: string,
  incidenciaId: string,
  entrada: ResolucionIncidenciaEntrada,
  accessToken: string,
): Promise<Incidencia> {
  try {
    return await request<Incidencia>(`/viajes/${id}/incidencias/${incidenciaId}`, {
      method: 'PATCH',
      body: entrada,
      accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      throw new ErrorAutorizacionInsuficiente();
    }
    throw error;
  }
}

/** Lista una página de estadías del viaje. */
export function listarEstadias(
  id: string,
  accessToken: string,
  cursor?: string,
): Promise<PaginaEstadias> {
  const query = cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`;
  return request<PaginaEstadias>(`/viajes/${id}/estadias${query}`, { accessToken });
}

/** Abre una estadía con los catálogos contractuales de motivo y autorización. */
export async function abrirEstadia(
  id: string,
  entrada: EstadiaEntrada,
  accessToken: string,
): Promise<Estadia> {
  try {
    return await request<Estadia>(`/viajes/${id}/estadias`, {
      method: 'POST',
      body: entrada,
      accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      throw new ErrorAutorizacionInsuficiente();
    }
    throw error;
  }
}

/** Cierra una estadía enviando el cuerpo vacío requerido por el contrato. */
export async function cerrarEstadia(
  id: string,
  estadiaId: string,
  accessToken: string,
): Promise<Estadia> {
  try {
    return await request<Estadia>(`/viajes/${id}/estadias/${estadiaId}`, {
      method: 'PATCH',
      body: {} satisfies CierreEstadiaEntrada,
      accessToken,
    });
  } catch (error) {
    clasificarErrorHistorico(error);
  }
}
