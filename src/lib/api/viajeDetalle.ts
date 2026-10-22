/*
 * Wrapper de dominio para detalle del viaje.
 *
 * Endpoints del BFF (contrato generado, tracer.15):
 *   GET /api/v1/viajes/{id}/detalle      → obtener detalle del viaje
 *   POST /api/v1/viajes/{id}/transiciones → cambiar estado del viaje
 *   PATCH /api/v1/viajes/{id}/eta        → fijar ETA estimado manual
 *   PATCH /api/v1/viajes/{id}/fecha-hora → completar/editar la fecha/hora del servicio
 *
 * Clasifica los códigos de conflicto (409) en errores específicos,
 * emite peticiones contra el BFF y devuelve el resultado.
 * Features/ y routes/ llaman aquí, nunca a client.ts.
 */

import type {
  Asignacion,
  AsignacionEntrada,
  EtaEntrada,
  FechaHoraEntrada,
  TransicionEntrada,
  ViajeDetalle,
} from '../contracts/viajeDetalle';
import { ApiError } from './errors';
import { request } from './client';

/**
 * Códigos de conflicto (409) que el BFF devuelve, tipificados según
 * la máquina de estados (bff.yaml fuente).
 */
export type ConflictoCodigoTransicion = 'transicion_no_permitida' | 'viaje_en_estado_terminal';

/**
 * Error de transición o ETA rechazado.
 * Encapsula los códigos de 409 del BFF para que la UI muestre mensajes contextuales.
 */
export class ErrorTransicion extends ApiError {
  override readonly codigo: ConflictoCodigoTransicion;

  constructor(codigo: ConflictoCodigoTransicion, message: string) {
    super('conflicto', message, 409, codigo);
    this.name = 'ErrorTransicion';
    this.codigo = codigo;
  }
}

/** Mensaje legible por código de conflicto (bff.yaml). */
const MENSAJE_CONFLICTO: Record<ConflictoCodigoTransicion, string> = {
  transicion_no_permitida: 'La transición solicitada no es permitida en este estado del viaje.',
  viaje_en_estado_terminal: 'No se puede fijar ETA en un viaje en estado terminal.',
};

/**
 * Convierte un fallo del cliente en `ErrorTransicion` cuando es un 409 cuyo
 * `codigo` reconocemos, leyendo el código REAL serializado por el `bff` (no el
 * endpoint). Para cualquier otro error, lo repropaga sin tocarlo.
 *
 * @param err Error capturado del wrapper `request`.
 * @param respaldo Código a asumir solo si el 409 no trajo `codigo` interpretable.
 */
function clasificarConflicto(err: unknown, respaldo: ConflictoCodigoTransicion): never {
  if (err instanceof ApiError && err.kind === 'conflicto' && err.status === 409) {
    const codigo: ConflictoCodigoTransicion =
      err.codigo === 'transicion_no_permitida' || err.codigo === 'viaje_en_estado_terminal'
        ? err.codigo
        : respaldo;
    throw new ErrorTransicion(codigo, MENSAJE_CONFLICTO[codigo]);
  }
  throw err;
}

/** Código contractual del 409 por exclusión de una unidad del roster. */
export type ConflictoCodigoAsignacion = 'recurso_no_disponible';

/** Error de carrera al reservar una unidad ya tomada por otro operador. */
export class ErrorAsignacion extends ApiError {
  override readonly codigo: ConflictoCodigoAsignacion;

  constructor(message = 'Una unidad ya no está disponible para este viaje.') {
    super('conflicto', message, 409, 'recurso_no_disponible');
    this.name = 'ErrorAsignacion';
    this.codigo = 'recurso_no_disponible';
  }
}

/**
 * Clasifica el conflicto contractual de asignación sin inventar códigos: la
 * operación `operacion.asignarRecursos` declara `recurso_no_disponible`.
 */
function clasificarConflictoAsignacion(err: unknown): never {
  if (err instanceof ApiError && err.kind === 'conflicto' && err.status === 409) {
    throw new ErrorAsignacion();
  }
  throw err;
}

/**
 * Obtiene el detalle del viaje incluyendo estado canónico, destinos y ETA estimado.
 *
 * @param id Identificador del viaje
 * @param accessToken Token de autenticación (Bearer)
 * @returns Detalle del viaje con estado canónico y condiciones activas
 * @throws ApiError con kind 'noAutorizado' si el token es inválido
 * @throws ApiError con kind 'prohibido' si el usuario no tiene alcance
 * @throws ApiError con kind 'noEncontrado' si el viaje no existe
 * @throws ApiError con kind 'red' si hay fallo de red o respuesta inválida
 */
export async function obtenerDetalle(id: string, accessToken: string): Promise<ViajeDetalle> {
  return request<ViajeDetalle>(`/viajes/${id}/detalle`, { accessToken });
}

/**
 * Transiciona el viaje a un nuevo estado validado por la máquina de estados.
 *
 * Si no es permitida o el viaje es terminal, devuelve 409 con un código específico.
 *
 * @param id Identificador del viaje
 * @param entrada Objeto con a_estado y causa?
 * @param accessToken Token de autenticación (Bearer)
 * @returns Detalle del viaje actualizado
 * @throws ErrorTransicion si la transición es rechazada (409)
 * @throws ApiError con kind 'noAutorizado' si el token es inválido
 * @throws ApiError con kind 'prohibido' si el usuario no tiene alcance
 * @throws ApiError con kind 'noEncontrado' si el viaje no existe
 * @throws ApiError con kind 'red' si hay fallo de red
 */
export async function transicionar(
  id: string,
  entrada: TransicionEntrada,
  accessToken: string,
): Promise<ViajeDetalle> {
  try {
    return await request<ViajeDetalle>(`/viajes/${id}/transiciones`, {
      method: 'POST',
      body: entrada,
      accessToken,
    });
  } catch (err) {
    // Clasifica el 409 por el `codigo` REAL del cuerpo. El respaldo solo aplica
    // si el `bff` no serializó código interpretable.
    clasificarConflicto(err, 'transicion_no_permitida');
  }
}

/**
 * Fija el ETA estimado manual para el viaje.
 *
 * No permite fijar ETA si el viaje es terminal (409 con código 'viaje_en_estado_terminal').
 *
 * @param id Identificador del viaje
 * @param entrada Objeto con eta_estimado (ISO 8601)
 * @param accessToken Token de autenticación (Bearer)
 * @returns Detalle del viaje actualizado con el nuevo eta_estimado
 * @throws ErrorTransicion si el viaje es terminal (409)
 * @throws ApiError con kind 'noAutorizado' si el token es inválido
 * @throws ApiError con kind 'prohibido' si el usuario no tiene alcance
 * @throws ApiError con kind 'noEncontrado' si el viaje no existe
 * @throws ApiError con kind 'red' si hay fallo de red
 */
export async function fijarEta(
  id: string,
  entrada: EtaEntrada,
  accessToken: string,
): Promise<ViajeDetalle> {
  try {
    return await request<ViajeDetalle>(`/viajes/${id}/eta`, {
      method: 'PATCH',
      body: entrada,
      accessToken,
    });
  } catch (err) {
    // Clasifica el 409 por el `codigo` REAL del cuerpo. El respaldo solo aplica
    // si el `bff` no serializó código interpretable.
    clasificarConflicto(err, 'viaje_en_estado_terminal');
  }
}

/**
 * Completa/edita la fecha y hora del servicio de un viaje (E8-T9).
 *
 * Operación real del `bff` desde tracer.15 (`completarFechaHora`,
 * `PATCH /viajes/{id}/fecha-hora`): escribe `fecha_hora_servicio` sobre un viaje
 * existente, guarda de la aprobación (E1-HU-003). No es un cambio de estado;
 * solo exige que el viaje no esté en un estado terminal.
 *
 * El único 409 que declara el contrato es `viaje_en_estado_terminal` (igual que
 * `fijarEta`), por lo que se usa ese como respaldo de clasificación.
 *
 * @param id Identificador del viaje
 * @param entrada Objeto con `fecha_hora_servicio` (ISO 8601)
 * @param accessToken Token de autenticación (Bearer)
 * @returns Detalle del viaje actualizado con la `fecha_hora_servicio` fijada
 * @throws ErrorTransicion si el viaje es terminal (409)
 * @throws ApiError con kind 'noAutorizado' si el token es inválido
 * @throws ApiError con kind 'prohibido' si el usuario no tiene alcance
 * @throws ApiError con kind 'noEncontrado' si el viaje no existe
 * @throws ApiError con kind 'red' si hay fallo de red
 */
export async function completarFechaHora(
  id: string,
  entrada: FechaHoraEntrada,
  accessToken: string,
): Promise<ViajeDetalle> {
  try {
    return await request<ViajeDetalle>(`/viajes/${id}/fecha-hora`, {
      method: 'PATCH',
      body: entrada,
      accessToken,
    });
  } catch (err) {
    // Clasifica el 409 por el `codigo` REAL del cuerpo. El respaldo solo aplica
    // si el `bff` no serializó código interpretable (contrato: viaje_en_estado_terminal).
    clasificarConflicto(err, 'viaje_en_estado_terminal');
  }
}

/**
 * Reserva una o más unidades completas como escolta del viaje.
 *
 * La ruta y la forma de wire son la superficie esperada del BFF; cuando el BFF
 * publique el contrato, este wrapper es el único punto que debe cambiar.
 */
export async function asignarEscolta(
  id: string,
  entrada: AsignacionEntrada,
  accessToken: string,
): Promise<Asignacion> {
  try {
    return await request<Asignacion>(`/viajes/${id}/asignacion`, {
      method: 'POST',
      body: entrada,
      accessToken,
    });
  } catch (err) {
    // El 409 contractual representa la carrera de exclusión del roster.
    clasificarConflictoAsignacion(err);
  }
}
