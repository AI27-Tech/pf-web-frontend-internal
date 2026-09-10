/*
 * Dataset del backend simulado.
 *
 * Devuelve la FORMA DE CONTRATO (snake_case), no modelos de la app. Así la app
 * corre su parser de verdad (parseSesion) en lugar de saltárselo. Ver README,
 * "El backend simulado".
 */

import type { SesionWire, UsuarioWire } from '@/lib/contracts';

/** Credenciales del operador demo. Documentadas en el README. */
export const DEMO_CREDENTIALS = {
  email: 'operador@demo.ai27',
  password: 'demo1234',
} as const;

/** Usuario demo, en forma de wire (snake_case). */
const DEMO_USER: UsuarioWire = {
  id: 'usr-demo-1',
  email: DEMO_CREDENTIALS.email,
  name: 'Operadora Demo',
  rol: 'operador',
  audiencia: 'Interno',
};

/**
 * Construye una respuesta de sesión en forma de wire. Los tokens son de mentira
 * a propósito: no hay verificación real detrás, solo desbloquean la UI.
 */
export function createSessionWire(): SesionWire {
  return {
    access_token: `mock.access.${crypto.randomUUID()}`,
    refresh_token: `mock.refresh.${crypto.randomUUID()}`,
    expires_in: 3600,
    usuario: DEMO_USER,
  };
}
