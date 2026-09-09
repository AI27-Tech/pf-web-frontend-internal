/*
 * Custodia del token en el navegador — PROVISIONAL.
 *
 * TODO(auth) — Decisión abierta #2: ADR 8 cierra el proveedor, no el
 * almacenamiento. Esta implementación con localStorage existe SOLO para que el
 * scaffold arranque y está aislada tras `TokenStore`. localStorage es lo peor
 * ante XSS; memoria + refresh en cookie httpOnly es mejor pero exige que bff
 * ponga esa cookie, y el contrato no lo dice.
 *
 * El resto de la app depende de la INTERFAZ, no de esta implementación.
 */

import type { Sesion } from '../contracts';

/** Contrato de custodia de la sesión. La app depende de esto, no del backing store. */
export interface TokenStore {
  cargar(): Sesion | null;
  guardar(sesion: Sesion): void;
  limpiar(): void;
}

const STORAGE_KEY = 'ai27.panel.sesion';

/** Implementación provisional sobre localStorage. Ver el TODO(auth) de arriba. */
export const tokenStore: TokenStore = {
  cargar() {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (raw === null || raw === undefined) return null;
      return JSON.parse(raw) as Sesion;
    } catch {
      // Un valor corrupto no debe tumbar el arranque: se trata como sin sesión.
      return null;
    }
  },

  guardar(sesion) {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(sesion));
  },

  limpiar() {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  },
};
