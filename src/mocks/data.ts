/*
 * Dataset del backend simulado.
 *
 * Devuelve la FORMA DE CONTRATO (snake_case) de `Sesion`, no modelos de la app.
 * Así la app corre su parser de verdad (parseSesion) en lugar de saltárselo —
 * incluida la decodificación de claims del access_token. Ver README,
 * "El backend simulado".
 */

import type { SesionWire } from '@/lib/contracts';
import { Rol } from '@/lib/contracts';

/** Credenciales del operador demo. Documentadas en el README. */
export const DEMO_CREDENTIALS = {
  usuario: 'operador@demo.ai27',
  contrasena: 'demo1234',
} as const;

/** Claims del operador demo, los que `decodificarClaims` espera extraer del token. */
const DEMO_CLAIMS = {
  sub: 'usr-demo-1',
  tenant_id: 'tenant-demo',
  rol: Rol.Monitorista,
  sesion_id: 'ses-demo-1',
} as const;

/**
 * Codifica un segmento como base64url sin padding, igual que un JWT real. El
 * contraparte de `decodificarBase64Url` en lib/contracts/jwt.ts.
 */
function base64Url(valor: string): string {
  const bytes = new TextEncoder().encode(valor);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Construye un access_token mock con forma de JWT (header.payload.firma). La
 * firma es de mentira —el mock no verifica nada—, pero el payload es un JSON de
 * claims real que la app puede decodificar.
 */
function mockAccessToken(): string {
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify(DEMO_CLAIMS));
  return `${header}.${payload}.firma-de-mentira`;
}

/**
 * Construye una respuesta de sesión en forma de wire (contrato `Sesion`). Los
 * tokens son de mentira a propósito: no hay verificación real detrás, solo
 * desbloquean la UI.
 */
export function createSessionWire(): SesionWire {
  return {
    sesion_id: DEMO_CLAIMS.sesion_id,
    access_token: mockAccessToken(),
    refresh_token: `mock.refresh.${crypto.randomUUID()}`,
    expira_en: new Date(Date.now() + 3600_000).toISOString(),
  };
}

/*
 * Viajes demo para la bandeja operativa (E8-T7).
 *
 * Forma de contrato del bff: `ViajeResumen = { id, estado, origen }`. El bff NO
 * entrega condiciones activas por ítem (brecha de contrato V1), así que el mock
 * tampoco las inventa. Los tokens de estado salen del enum real (ADR 19).
 */

import { EstadoViaje } from '@/lib/contracts/viajes';
import type { ViajeResumen, PaginaViajesResumen } from '@/lib/contracts/viajes';

/** Catálogo de viajes demo del alcance del operador. */
const VIAJES_DEMO: readonly ViajeResumen[] = [
  { id: 'VJ-1001', estado: EstadoViaje.EnTransito, origen: 'CDMX' },
  { id: 'VJ-1002', estado: EstadoViaje.Solicitado, origen: 'Monterrey' },
  { id: 'VJ-1003', estado: EstadoViaje.Asignado, origen: 'Guadalajara' },
  { id: 'VJ-1004', estado: EstadoViaje.EnDestino, origen: 'Querétaro' },
  { id: 'VJ-1005', estado: EstadoViaje.Aprobado, origen: 'Puebla' },
  { id: 'VJ-1006', estado: EstadoViaje.EnTransito, origen: 'Toluca' },
  { id: 'VJ-1007', estado: EstadoViaje.Cerrado, origen: 'León' },
  { id: 'VJ-1008', estado: EstadoViaje.EnDescarga, origen: 'Veracruz' },
];

/** Tamaño de página del listado simulado. */
const TAMANO_PAGINA = 5;

/**
 * Arma una `PaginaViajesResumen` aplicando el filtro por estado y la paginación
 * por cursor opaco. El filtrado lo hace el "bff" simulado (no el navegador, P10):
 * el cliente solo manda `estado`/`cursor` y muestra lo que regresa.
 *
 * El cursor es el índice de inicio de la siguiente página, codificado como texto.
 */
export function listarViajesMock(
  estado: string | null,
  cursor: string | null,
): PaginaViajesResumen {
  const filtrados = estado ? VIAJES_DEMO.filter((v) => v.estado === estado) : VIAJES_DEMO;

  const inicio = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
  const items = filtrados.slice(inicio, inicio + TAMANO_PAGINA);
  const fin = inicio + items.length;
  const cursor_siguiente = fin < filtrados.length ? String(fin) : null;

  return { items, cursor_siguiente };
}
