/*
 * Constantes del cliente. Las bases vienen de variables de entorno; este módulo
 * solo las lee. Acceso por PUNTO a import.meta.env: es lo que Vite sustituye
 * estáticamente.
 */

/** bff: la única superficie HTTP. Vacío = mismo origen (así corre en modo mock). */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

/** Prefijo de versión de la superficie HTTP de bff. */
export const API_PREFIX = '/api/v1';

/**
 * Margen con el que se refresca la sesión antes de expirar. El refresco es el
 * punto donde bff reevalúa los claims; refrescar con holgura acota la ventana.
 */
export const SESSION_REFRESH_MARGIN_MS = 60_000;
