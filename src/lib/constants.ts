/*
 * Constantes del cliente. Las bases vienen de variables de entorno; este módulo
 * solo las lee. Acceso por PUNTO a import.meta.env: es lo que Vite sustituye
 * estáticamente.
 */

/** bff: la única superficie HTTP. Vacío = mismo origen (así corre en modo mock). */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

/** Cadencia por defecto del polling de la bandeja de conversaciones. */
export const CONVERSACIONES_POLLING_MS_DEFECTO = 15_000;

/**
 * Interpreta la cadencia del polling (ms) a partir de la variable de entorno.
 * Solo acepta un entero positivo escrito en dígitos; cualquier otro valor
 * (vacío, texto, cero, negativo, decimal, notación científica) usa el defecto.
 * La cadencia es configuración del cliente, no parte del contrato (E8-T15, Req 11.3).
 */
export function leerCadenciaPolling(valor: unknown): number {
  if (typeof valor !== 'string' || !/^\d+$/.test(valor.trim())) {
    return CONVERSACIONES_POLLING_MS_DEFECTO;
  }
  const ms = Number(valor.trim());
  return Number.isSafeInteger(ms) && ms > 0 ? ms : CONVERSACIONES_POLLING_MS_DEFECTO;
}

/** Cadencia del polling de la bandeja de conversaciones (`VITE_CONVERSACIONES_POLLING_MS`). */
export const CONVERSACIONES_POLLING_MS: number = leerCadenciaPolling(
  import.meta.env.VITE_CONVERSACIONES_POLLING_MS,
);

/** Prefijo de versión de la superficie HTTP de bff. */
export const API_PREFIX = '/api/v1';

/**
 * Margen con el que se refresca la sesión antes de expirar. El refresco es el
 * punto donde bff reevalúa los claims; refrescar con holgura acota la ventana.
 */
export const SESSION_REFRESH_MARGIN_MS = 60_000;
