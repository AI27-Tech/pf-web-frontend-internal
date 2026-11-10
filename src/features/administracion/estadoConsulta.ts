/*
 * Estado de una consulta de administración (R2.5, R2.7, R2.8, R9.13, R13.1, R13.2).
 *
 * Función pura: deriva un único estado excluyente de `isLoading`, `isError`,
 * el error y los datos. El estado `brecha` aparece cuando la capacidad no está
 * publicada. El estado `datos_desactualizado` conserva los datos previos y aparece
 * cuando la consulta falla con datos ya cargados; nunca muestra "vacío" en ese caso.
 */

import { ApiError } from '@/lib/api/errors';
import { ErrorSuperficieNoPublicada } from '@/lib/api/administracion';

import { TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';

export type EstadoConsultaTipo =
  'brecha' | 'cargando' | 'vacio' | 'error' | 'sin_acceso' | 'datos' | 'datos_desactualizado';

export interface EstadoConsulta<T> {
  readonly estado: EstadoConsultaTipo;
  /** Datos a mostrar. Presentes en `datos` y `datos_desactualizado`. */
  readonly datos?: T;
}

export interface EntradaConsulta<T> {
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: unknown;
  readonly data: T | undefined;
}

/**
 * Deriva el estado de la consulta. El orden de las reglas importa:
 * 1. Capacidad no publicada → `brecha`.
 * 2. Fallo: 403 → `sin_acceso`; con datos previos → `datos_desactualizado`; sin datos → `error`.
 * 3. Sin datos (cargando o aún sin resolver) → `cargando`.
 * 4. Datos que `esVacio` considera vacíos → `vacio`.
 * 5. Resto → `datos`.
 */
export function estadoConsulta<T>(
  entrada: EntradaConsulta<T>,
  esVacio: (datos: T) => boolean = () => false,
): EstadoConsulta<T> {
  if (entrada.isError) {
    if (entrada.error instanceof ErrorSuperficieNoPublicada) return { estado: 'brecha' };
    if (entrada.error instanceof ApiError && entrada.error.status === 403) {
      return { estado: 'sin_acceso' };
    }
    if (entrada.data !== undefined) return { estado: 'datos_desactualizado', datos: entrada.data };
    return { estado: 'error' };
  }

  if (entrada.data === undefined) return { estado: 'cargando' };
  if (esVacio(entrada.data)) return { estado: 'vacio' };
  return { estado: 'datos', datos: entrada.data };
}

/**
 * Aviso que acompaña a un estado que no muestra datos nuevos. `alerta` indica si el
 * aviso se anuncia como alerta. Devuelve `null` en `cargando`, `vacio` y `datos`:
 * esos los muestra la tabla de la librería (`loading`, `emptyState`).
 */
export function avisoDeEstado(
  estado: EstadoConsultaTipo,
): { readonly texto: string; readonly alerta: boolean } | null {
  switch (estado) {
    case 'brecha':
      return { texto: TEXTOS.seccionNoPublicada, alerta: false };
    case 'error':
      return { texto: TEXTOS.errorConsulta, alerta: true };
    case 'sin_acceso':
      return { texto: TEXTOS.sinAccesoConsulta, alerta: true };
    case 'datos_desactualizado':
      return { texto: TEXTOS.datosDesactualizados, alerta: true };
    case 'cargando':
    case 'vacio':
    case 'datos':
      return null;
  }
}
