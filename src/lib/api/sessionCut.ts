import { tokenStore } from './tokenStore';

export type SessionCutReason = 'sesion_finalizada';
type SessionCutListener = (motivo: SessionCutReason) => void;

const listeners = new Set<SessionCutListener>();
let corteEjecutado = false;

/** Ejecuta el corte de sesión una sola vez hasta que una nueva sesión se inicie. */
export function cortarSesion(motivo: SessionCutReason = 'sesion_finalizada'): boolean {
  if (corteEjecutado) return false;

  corteEjecutado = true;
  tokenStore.limpiar();
  for (const listener of listeners) listener(motivo);
  return true;
}

/** Registra una reacción al corte y devuelve su desuscriptor. */
export function onCut(listener: SessionCutListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Habilita el siguiente corte después de iniciar una nueva sesión. */
export function restablecerCorte(): void {
  corteEjecutado = false;
}
