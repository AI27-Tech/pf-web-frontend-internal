/*
 * Frontera de formulario para la ficha técnica (E8-T12).
 *
 * El modelo de pantalla se transforma aquí a FichaTecnicaEntrada. No se agregan
 * campos fuera del contrato: las colecciones se reemplazan y los GPS se
 * deduplican antes de enviarse.
 */

import { ApiError } from '@/lib/api/errors';
import type { FichaTecnica, FichaTecnicaEntrada } from '@/lib/contracts/fichaTecnica';

type TractoForm = NonNullable<FichaTecnica['tracto']>;
type ContenedorForm = NonNullable<FichaTecnica['contenedores']>[number];

export type CampoTracto = keyof TractoForm;
export type CampoContenedor = keyof ContenedorForm;

export interface DatosFichaTecnica {
  readonly tracto: TractoForm | null;
  readonly contenedores: readonly ContenedorForm[];
  readonly gpsIds: readonly string[];
}

export interface ErroresFichaTecnica {
  readonly formulario?: string;
}

export const CAMPOS_TRACTO: readonly CampoTracto[] = [
  'placas',
  'economico',
  'marca',
  'modelo',
  'color',
];

export const CAMPOS_CONTENEDOR: readonly CampoContenedor[] = [
  'economico',
  'placas',
  'sello',
  'color',
];

export function datosDesdeFicha(ficha: FichaTecnica | null): DatosFichaTecnica {
  return {
    tracto: ficha?.tracto ?? {},
    contenedores: ficha?.contenedores ?? [],
    gpsIds: ficha?.gps_ids ?? [],
  };
}

export function validarDatosFicha(datos: DatosFichaTecnica): ErroresFichaTecnica {
  // Todos los campos de la ficha son opcionales en V1. La validación de alcance
  // y persistencia pertenece al BFF.
  void datos;
  return {};
}

function limpiarObjeto<T extends Record<string, unknown>>(valor: T): T {
  return Object.fromEntries(
    Object.entries(valor).filter(([, contenido]) => String(contenido ?? '').trim().length > 0),
  ) as T;
}

export function construirFichaEntrada(datos: DatosFichaTecnica): FichaTecnicaEntrada {
  const tracto = datos.tracto === null ? null : limpiarObjeto(datos.tracto);
  const contenedores = datos.contenedores
    .map((contenedor) => limpiarObjeto(contenedor))
    .filter((contenedor) => Object.keys(contenedor).length > 0);

  return {
    tracto,
    contenedores,
    gps_ids: [...new Set(datos.gpsIds.filter((id) => id.trim().length > 0))],
  };
}

export function esFichaConfirmada(
  respuesta: FichaTecnica | undefined,
  viajeId: string,
): respuesta is FichaTecnica {
  return Boolean(respuesta?.viaje_id && respuesta.viaje_id === viajeId);
}

export function mensajeErrorGuardarFicha(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'noAutorizado') return 'Tu sesión o autorización ya no es válida.';
    if (error.kind === 'noEncontrado') return 'El viaje ya no está disponible.';
    if (error.kind === 'degradado') return 'El servicio no está disponible. Reintenta más tarde.';
    if (error.kind === 'red') return 'No se pudo conectar con el servicio. Revisa la conexión.';
    if (error.kind === 'conflicto')
      return 'La ficha cambió en otra operación. Recarga e intenta de nuevo.';
  }
  return error instanceof Error
    ? error.message
    : 'No se pudo guardar la ficha. Revisa los datos e intenta de nuevo.';
}
