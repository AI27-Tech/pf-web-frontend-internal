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
import { EstadoViaje, TRANSICIONES_VIAJE } from '@/lib/contracts/viajeDetalle';
import type { ViajeResumen, PaginaViajesResumen, CrearViajeEntrada } from '@/lib/contracts/viajes';
import type { Cliente, PaginaClientes } from '@/lib/contracts/clientes';
import type { ViajeDetalle } from '@/lib/contracts/viajeDetalle';
import type { Asignacion, AptitudRecurso } from '@/lib/contracts/viajeDetalle';
import type { Unidad } from '@/lib/contracts/unidades';

/** Credenciales del operador demo. Documentadas en el README. */
export const DEMO_CREDENTIALS = {
  usuario: 'operador@demo.ai27',
  contrasena: 'demo1234',
} as const;

/** Claims del operador demo, los que `decodificarClaims` espera extraer del token. */
const DEMO_CLAIMS = {
  sub: 'usr-demo-1',
  tenant_id: 'tenant-demo',
  rol: Rol.JefeOperativo,
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
 * Forma de contrato del bff: `ViajeResumen = { id, estado, origen }`.
 * Los tokens de estado salen del enum real (ADR 19).
 */

/** Catálogo de viajes demo del alcance del operador. */
const VIAJES_DEMO: ViajeResumen[] = [
  { id: 'VJ-1001', estado: EstadoViaje.EnTransito, origen: 'CDMX' },
  { id: 'VJ-1002', estado: EstadoViaje.Solicitado, origen: 'Monterrey' },
  { id: 'VJ-1003', estado: EstadoViaje.Asignado, origen: 'Guadalajara' },
  { id: 'VJ-1004', estado: EstadoViaje.EnDestino, origen: 'Querétaro' },
  { id: 'VJ-1005', estado: EstadoViaje.Aprobado, origen: 'Puebla' },
  { id: 'VJ-1006', estado: EstadoViaje.EnTransito, origen: 'Toluca' },
  { id: 'VJ-1007', estado: EstadoViaje.Cerrado, origen: 'León' },
  { id: 'VJ-1008', estado: EstadoViaje.EnDescarga, origen: 'Veracruz' },
  // E8-T9: solicitud SIN fecha/hora (Aprobar bloqueado hasta completarla).
  { id: 'VJ-1009', estado: EstadoViaje.Solicitado, origen: 'Tijuana' },
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

export const CLIENTES_DEMO: readonly Cliente[] = [
  { id: 'CLI-1001', nombre: 'Cliente Norte', estado: 'activo', contrato_vigente_id: null },
  { id: 'CLI-1002', nombre: 'Cliente Centro', estado: 'activo', contrato_vigente_id: null },
  { id: 'CLI-1003', nombre: 'Cliente Sur', estado: 'activo', contrato_vigente_id: null },
];

/** Página cursorada del catálogo que el BFF proyecta para el selector. */
export function listarClientesMock(cursor: string | null): PaginaClientes {
  const inicio = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
  const items = CLIENTES_DEMO.slice(inicio, inicio + 2);
  const fin = inicio + items.length;
  return {
    items,
    cursor_siguiente: fin < CLIENTES_DEMO.length ? String(fin) : null,
  };
}

/*
 * los mocks cumplen la forma de `ViajeDetalle` de `@ai27-tech/contracts`.
 *
 * Base de datos simulada: detalles por ID. Cada viaje expone:
 * - estado canónico (EstadoViaje)
 * - origen (dirección como texto)
 * - destinos (array de paradas con nombre y número de envío)
 * - fecha_hora_servicio (opcional, ISO 8601)
 * - eta_estimado (opcional, ISO 8601, si fue fijado)
 * - condiciones_activas (lista de INCIDENCIA, SIN_SENAL, etc.)
 */

interface ViajeDetalleStore {
  [id: string]: ViajeDetalle;
}

/** Catálogo de detalles por ID (estados canónicos, destinos, eta_estimado). */
const DETALLES_VIAJES: ViajeDetalleStore = {
  'VJ-1001': {
    viaje: {
      id: 'VJ-1001',
      estado: EstadoViaje.EnTransito,
      origen: 'Av. Paseo de la Reforma 505, México CDMX',
      destinos: [
        { nombre: 'Centro de Distribución A', numero_envio: 'ENV-1001-A' },
        { nombre: 'Oficina Regional B', numero_envio: 'ENV-1001-B' },
      ],
      fecha_hora_servicio: new Date(Date.now() + 3600_000).toISOString(),
      creado_en: new Date(Date.now() - 86400_000).toISOString(),
    },
    condiciones_activas: [],
  },
  'VJ-1002': {
    viaje: {
      id: 'VJ-1002',
      estado: EstadoViaje.Solicitado,
      origen: 'Barrio Antiguo, Monterrey',
      destinos: [{ nombre: 'Almacén Central Monterrey', numero_envio: 'ENV-1002-A' }],
      fecha_hora_servicio: new Date(Date.now() + 7200_000).toISOString(),
      creado_en: new Date(Date.now() - 3600_000).toISOString(),
    },
    condiciones_activas: [],
  },
  'VJ-1003': {
    viaje: {
      id: 'VJ-1003',
      estado: EstadoViaje.Asignado,
      origen: 'Centro Histórico, Guadalajara',
      destinos: [{ nombre: 'Sucursal Guadalajara', numero_envio: 'ENV-1003-A' }],
      fecha_hora_servicio: new Date(Date.now() + 5400_000).toISOString(),
      creado_en: new Date(Date.now() - 7200_000).toISOString(),
    },
    condiciones_activas: [],
  },
  'VJ-1004': {
    viaje: {
      id: 'VJ-1004',
      estado: EstadoViaje.EnDestino,
      origen: 'Centro de Querétaro',
      destinos: [
        { nombre: 'Punto de Entrega 1', numero_envio: 'ENV-1004-A' },
        { nombre: 'Punto de Entrega 2', numero_envio: 'ENV-1004-B' },
      ],
      fecha_hora_servicio: new Date(Date.now() + 1800_000).toISOString(),
      eta_estimado: new Date(Date.now() + 1800_000).toISOString(),
      creado_en: new Date(Date.now() - 10800_000).toISOString(),
    },
    condiciones_activas: [],
  },
  'VJ-1005': {
    viaje: {
      id: 'VJ-1005',
      estado: EstadoViaje.Aprobado,
      origen: 'Zócalo de Puebla',
      destinos: [{ nombre: 'Centro de Operaciones Puebla', numero_envio: 'ENV-1005-A' }],
      fecha_hora_servicio: new Date(Date.now() + 10800_000).toISOString(),
      creado_en: new Date(Date.now() - 1800_000).toISOString(),
    },
    condiciones_activas: [],
  },
  'VJ-1006': {
    viaje: {
      id: 'VJ-1006',
      estado: EstadoViaje.EnTransito,
      origen: 'Centro Toluca',
      destinos: [{ nombre: 'Depósito Toluca', numero_envio: 'ENV-1006-A' }],
      fecha_hora_servicio: new Date(Date.now() + 2700_000).toISOString(),
      creado_en: new Date(Date.now() - 5400_000).toISOString(),
    },
    condiciones_activas: [],
  },
  'VJ-1007': {
    viaje: {
      id: 'VJ-1007',
      estado: EstadoViaje.Cerrado,
      origen: 'Centro de León',
      destinos: [{ nombre: 'Estación Final León', numero_envio: 'ENV-1007-A' }],
      fecha_hora_servicio: new Date(Date.now() - 3600_000).toISOString(),
      eta_estimado: new Date(Date.now() - 1800_000).toISOString(),
      creado_en: new Date(Date.now() - 172800_000).toISOString(),
    },
    condiciones_activas: [],
  },
  'VJ-1008': {
    viaje: {
      id: 'VJ-1008',
      estado: EstadoViaje.EnDescarga,
      origen: 'Puerto de Veracruz',
      destinos: [{ nombre: 'Zona de Descarga Veracruz', numero_envio: 'ENV-1008-A' }],
      fecha_hora_servicio: new Date(Date.now() - 1800_000).toISOString(),
      eta_estimado: new Date(Date.now()).toISOString(),
      creado_en: new Date(Date.now() - 259200_000).toISOString(),
    },
    condiciones_activas: [],
  },
  // E8-T9: solicitud SIN fecha/hora. Aprobar permanece deshabilitado hasta que el
  // Jefe Operativo complete `fecha_hora_servicio` vía `completarFechaHoraMock`.
  'VJ-1009': {
    viaje: {
      id: 'VJ-1009',
      estado: EstadoViaje.Solicitado,
      origen: 'Zona Centro, Tijuana',
      destinos: [{ nombre: 'Bodega Frontera Tijuana', numero_envio: 'ENV-1009-A' }],
      // fecha_hora_servicio ausente a propósito (guard de aprobación, E8-T9).
      creado_en: new Date(Date.now() - 1200_000).toISOString(),
    },
    condiciones_activas: [],
  },
};

let siguienteViajeDemo = 2000;

/** Crea un viaje APROBADO en la base simulada y deja listo su detalle. */
export function crearViajeMock(entrada: CrearViajeEntrada): ViajeResumen {
  const id = `VJ-${siguienteViajeDemo++}`;
  const creado_en = new Date().toISOString();
  const viaje: ViajeResumen = {
    id,
    estado: EstadoViaje.Aprobado,
    origen: entrada.origen,
  };

  VIAJES_DEMO.push(viaje);
  DETALLES_VIAJES[id] = {
    viaje: {
      id,
      estado: EstadoViaje.Aprobado,
      cliente_id: entrada.cliente_id ?? null,
      origen: entrada.origen,
      destinos: entrada.destinos,
      fecha_hora_servicio: entrada.fecha_hora_servicio ?? null,
      creado_en,
    },
    condiciones_activas: [],
  };

  return viaje;
}

/**
 * Recupera el detalle completo de un viaje por ID.
 *
 * Devuelve `null` si el viaje no existe en la base de datos simulada.
 */
export function obtenerDetalleViajeMock(id: string): ViajeDetalle | null {
  return DETALLES_VIAJES[id] ?? null;
}

/**
 * Almacena una mutación de estado del viaje (transición).
 *
 * Valida que la transición sea permitida; si no, devuelve `false`.
 * Si es válida, actualiza el estado y devuelve `true`.
 */
export function transicionarViajeMock(id: string, a_estado: string): boolean {
  const detalle = DETALLES_VIAJES[id];
  if (!detalle) return false;

  // Validación directa contra la tabla de transiciones (sin confiar en el tipo)
  const valido = TRANSICIONES_VIAJE.some(
    ([desde, hacia]) => desde === detalle.viaje.estado && hacia === a_estado,
  );

  if (!valido) {
    return false;
  }

  detalle.viaje.estado = a_estado;
  return true;
}

/**
 * Fija el ETA estimado del viaje.
 *
 * Si el viaje está en un estado terminal, devuelve `false`.
 * Si es válido, actualiza el `eta_estimado` y devuelve `true`.
 */
export function fijarEtaMock(id: string, eta_estimado: string): boolean {
  const detalle = DETALLES_VIAJES[id];
  if (!detalle) return false;

  // Validación directa contra los estados terminales (sin confiar en el tipo)
  const estadosTerminales = ['RECHAZADO_POR_AI27', 'RECHAZADO_POR_CLIENTE', 'CERRADO', 'CANCELADO'];
  if (estadosTerminales.includes(detalle.viaje.estado)) {
    return false;
  }

  detalle.viaje.eta_estimado = eta_estimado;
  return true;
}

/**
 * Completa/edita la fecha/hora del servicio del viaje (E8-T9).
 *
 * Simula la operación real `completarFechaHora` del `bff` (contrato tracer.15).
 * Valida que la fecha/hora venga no vacía; si es válida, la actualiza y devuelve
 * `true`.
 *
 * Devuelve `false` si el viaje no existe o si la fecha/hora es inválida.
 */
export function completarFechaHoraMock(id: string, fecha_hora_servicio: string): boolean {
  const detalle = DETALLES_VIAJES[id];
  if (!detalle) return false;

  if (typeof fecha_hora_servicio !== 'string' || fecha_hora_servicio.trim().length === 0) {
    return false;
  }

  detalle.viaje.fecha_hora_servicio = fecha_hora_servicio;
  return true;
}

/** Roster demo: incluye unidades activas e inactivas; ambas se pueden seleccionar. */
export const UNIDADES_DEMO: readonly Unidad[] = [
  {
    id: 'UN-1001',
    vehiculo_id: 'VEH-2001',
    custodios_ids: ['CUS-3001', 'CUS-3002'],
    tipo: 'patrulla',
    activa: true,
  },
  {
    id: 'UN-1002',
    vehiculo_id: 'VEH-2002',
    custodios_ids: ['CUS-3003'],
    tipo: 'moto',
    activa: false,
  },
];

/** Escenario explícito del roster sin unidades disponibles para pruebas de UI. */
export const UNIDADES_SIN_DISPONIBLES_DEMO: readonly Unidad[] = [];

/** Devuelve una página del roster con la forma esperada por el BFF. */
export function listarUnidadesMock(unidades: readonly Unidad[] = UNIDADES_DEMO) {
  return { items: [...unidades], cursor_siguiente: null };
}

function aptitudDemo(recurso: AptitudRecurso['recurso'], recurso_id: string): AptitudRecurso {
  return { recurso, recurso_id, estado: 'apto' };
}

/**
 * Aplica la asignación atómica al detalle demo y devuelve su resultado.
 * La aptitud aparece solo aquí, después de reservar, y nunca en el roster.
 */
export function asignarEscoltaMock(id: string, unidades_ids: string[]): Asignacion | null {
  const detalle = DETALLES_VIAJES[id];
  if (!detalle) return null;

  detalle.viaje.estado = EstadoViaje.Asignado;
  return {
    viaje_id: id,
    estado: EstadoViaje.Asignado,
    unidades: unidades_ids.map((unidad_id) => {
      const unidad = UNIDADES_DEMO.find((item) => item.id === unidad_id);
      return {
        unidad_id,
        aptitud: unidad
          ? [
              aptitudDemo('vehiculo', unidad.vehiculo_id),
              ...unidad.custodios_ids.map((custodio_id) => aptitudDemo('custodio', custodio_id)),
            ]
          : [],
      };
    }),
  };
}
