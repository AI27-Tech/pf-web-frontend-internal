/*
 * Frontera contractual del flujo de creación por Operación (E8-T11).
 *
 * Este módulo es el único lugar que transforma el estado de la pantalla a los
 * tipos generados y encadena crearViaje → asignarRecursos. No infiere estados
 * ni emite una operación de compensación cuando la respuesta es insuficiente.
 */

import { EstadoViaje } from '@/lib/contracts/viajes';
import type { Asignacion, AsignacionEntrada } from '@/lib/contracts/viajeDetalle';
import type { CrearViajeEntrada, ViajeResumen } from '@/lib/contracts/viajes';
import { ApiError } from '@/lib/api/errors';
import { asignarEscolta } from '@/lib/api/viajeDetalle';
import { crearViaje } from '@/lib/api/viajes';

export interface DatosCrearViaje {
  readonly clienteId: string;
  readonly origen: string;
  readonly destinos: readonly string[];
  /** Valor del input datetime-local, en la zona local del operador. */
  readonly fechaHora: string;
  readonly unidadesIds: readonly string[];
}

export interface ErroresCrearViaje {
  cliente?: string;
  origen?: string;
  destinos?: string;
  fechaHora?: string;
}

export type ResultadoCrearViaje =
  | {
      readonly tipo: 'aprobado';
      readonly viaje: ViajeResumen;
    }
  | {
      readonly tipo: 'asignado';
      readonly viaje: ViajeResumen;
      readonly asignacion: Asignacion;
    }
  | {
      readonly tipo: 'asignacion_fallida';
      readonly viaje: ViajeResumen;
      readonly error: Error;
    }
  | {
      readonly tipo: 'respuesta_insuficiente';
      readonly viaje?: ViajeResumen;
      readonly etapa: 'crearViaje' | 'asignarRecursos';
      readonly mensaje: string;
    };

export function quitarError(
  errores: ErroresCrearViaje,
  campo: keyof ErroresCrearViaje,
): ErroresCrearViaje {
  const siguientes = { ...errores };
  delete siguientes[campo];
  return siguientes;
}

export function validarDatosCrearViaje(datos: DatosCrearViaje): ErroresCrearViaje {
  const errores: ErroresCrearViaje = {};

  if (!datos.clienteId.trim()) errores.cliente = 'Selecciona un cliente.';
  if (!datos.origen.trim()) errores.origen = 'Ingresa un origen.';
  if (datos.destinos.length === 0 || datos.destinos.some((destino) => !destino.trim())) {
    errores.destinos = 'Ingresa al menos un destino válido.';
  }
  if (!datos.fechaHora.trim() || Number.isNaN(new Date(datos.fechaHora).getTime())) {
    errores.fechaHora = 'Ingresa una fecha y hora válida.';
  }

  return errores;
}

/** Convierte la fecha local del control a la marca de tiempo contractual. */
export function fechaHoraAISO(fechaHora: string): string {
  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) {
    throw new Error('La fecha y hora del servicio no es válida.');
  }
  return fecha.toISOString();
}

export function construirCrearViajeEntrada(datos: DatosCrearViaje): CrearViajeEntrada {
  return {
    cliente_id: datos.clienteId.trim(),
    origen: datos.origen.trim(),
    destinos: datos.destinos.map((nombre) => ({ nombre: nombre.trim() })),
    fecha_hora_servicio: fechaHoraAISO(datos.fechaHora),
  };
}

function esResumenValido(respuesta: ViajeResumen | undefined): respuesta is ViajeResumen {
  return Boolean(respuesta?.id && respuesta.estado && respuesta.origen !== undefined);
}

function esAsignacionValida(respuesta: Asignacion | undefined): respuesta is Asignacion {
  return Boolean(
    respuesta?.viaje_id &&
    respuesta.estado === EstadoViaje.Asignado &&
    Array.isArray(respuesta.unidades) &&
    respuesta.unidades.length > 0,
  );
}

function esEstadoAprobado(estado: string): boolean {
  return estado === EstadoViaje.Aprobado;
}

function errorRespuestaInsuficiente(etapa: 'crearViaje' | 'asignarRecursos'): Error {
  return new Error(
    `La respuesta de ${etapa} no permite confirmar el identificador, estado o escolta requeridos.`,
  );
}

/**
 * Clasifica un error de API para que la pantalla pueda ofrecer una acción
 * recuperable sin decidir autorización, alcance o disponibilidad localmente.
 */
export function mensajeErrorCrearViaje(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'noAutorizado') return 'Tu sesión o autorización ya no es válida.';
    if (error.kind === 'conflicto')
      return 'La escolta ya no está disponible. Revisa las unidades seleccionadas.';
    if (error.kind === 'degradado') return 'El servicio no está disponible. Reintenta más tarde.';
    if (error.kind === 'red')
      return 'No se pudo conectar con el servicio. Revisa la conexión y reintenta.';
    if (error.kind === 'noEncontrado') return 'El recurso solicitado ya no está disponible.';
  }
  return error instanceof Error
    ? error.message
    : 'No se pudo crear el viaje. Revisa los datos y reintenta.';
}

/** Ejecuta una sola vez la secuencia contractual de creación y asignación opcional. */
export async function ejecutarCreacion(
  datos: DatosCrearViaje,
  accessToken: string,
): Promise<ResultadoCrearViaje> {
  const errores = validarDatosCrearViaje(datos);
  if (Object.keys(errores).length > 0) {
    throw new Error('Completa los campos obligatorios antes de confirmar.');
  }

  const viaje = await crearViaje(construirCrearViajeEntrada(datos), accessToken);
  if (!esResumenValido(viaje)) {
    return {
      tipo: 'respuesta_insuficiente',
      etapa: 'crearViaje',
      mensaje: errorRespuestaInsuficiente('crearViaje').message,
    };
  }

  if (datos.unidadesIds.length === 0) {
    if (!esEstadoAprobado(viaje.estado)) {
      return {
        tipo: 'respuesta_insuficiente',
        viaje,
        etapa: 'crearViaje',
        mensaje: 'La creación no confirmó el estado APROBADO requerido.',
      };
    }
    return { tipo: 'aprobado', viaje };
  }

  const entrada: AsignacionEntrada = { unidades_ids: [...datos.unidadesIds] };
  try {
    const asignacion = await asignarEscolta(viaje.id, entrada, accessToken);
    if (!esAsignacionValida(asignacion) || asignacion.viaje_id !== viaje.id) {
      return {
        tipo: 'respuesta_insuficiente',
        viaje,
        etapa: 'asignarRecursos',
        mensaje: errorRespuestaInsuficiente('asignarRecursos').message,
      };
    }

    return { tipo: 'asignado', viaje, asignacion };
  } catch (error) {
    return {
      tipo: 'asignacion_fallida',
      viaje,
      error: error instanceof Error ? error : new Error(mensajeErrorCrearViaje(error)),
    };
  }
}
