/*
 * Custodia de la sesión.
 *
 * El refreshToken vive únicamente en memoria: no se persiste en localStorage ni
 * sessionStorage. El accessToken y los metadatos de sesión conservan la
 * persistencia provisional existente para que una recarga pueda llegar al
 * siguiente 401; después de la recarga ya no hay refreshToken utilizable y el
 * corte es la reacción esperada.
 */

import type { Sesion } from '../contracts';

export interface TokenStore {
  cargar(): Sesion | null;
  guardar(sesion: Sesion): void;
  limpiar(): void;
}

const STORAGE_KEY = 'ai27.panel.sesion';
let refreshTokenEnMemoria: string | undefined;
let sesionEnMemoria: Sesion | null = null;

function cargarPersistida(): Sesion | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) return null;
    return JSON.parse(raw) as Sesion;
  } catch {
    return null;
  }
}

function guardarPersistida(sesion: Sesion): void {
  globalThis.localStorage?.setItem(
    STORAGE_KEY,
    JSON.stringify({
      sesionId: sesion.sesionId,
      accessToken: sesion.accessToken,
      expiraEn: sesion.expiraEn,
      usuario: sesion.usuario,
    }),
  );
}

export const tokenStore: TokenStore = {
  cargar() {
    if (sesionEnMemoria !== null) return sesionEnMemoria;
    const persistida = cargarPersistida();
    if (persistida === null) return null;
    sesionEnMemoria = persistida;
    return persistida;
  },

  guardar(sesion) {
    sesionEnMemoria = sesion;
    refreshTokenEnMemoria = sesion.refreshToken;
    guardarPersistida(sesion);
  },

  limpiar() {
    sesionEnMemoria = null;
    refreshTokenEnMemoria = undefined;
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  },
};

/** Solo el cliente HTTP necesita consultar el refreshToken efímero. */
export function obtenerRefreshTokenEnMemoria(): string | undefined {
  return refreshTokenEnMemoria;
}
