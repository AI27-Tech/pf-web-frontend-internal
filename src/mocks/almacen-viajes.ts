/*
 * Almacén único de viajes del modo mock (spec modo-mock-coherencia-datos, tarea 2).
 *
 * Una sola fuente para listado, detalle, ficha, expediente, incidencias, escolta,
 * emergencias y reportes. Los módulos de mock leen y escriben aquí en lugar de
 * mantener copias propias.
 *
 * `resumen` (listado) no se guarda: se proyecta desde `detalle.viaje`, para que el
 * estado exista una sola vez.
 */

import type { FichaTecnica } from '@/lib/contracts/fichaTecnica';
import type { Incidencia } from '@/lib/contracts/historicoViaje';
import type { EmergenciaReaccion, EmergenciaViaje } from '@/lib/contracts/emergencias';
import { EstadoViaje } from '@/lib/contracts/viajeDetalle';
import type { ViajeDetalle } from '@/lib/contracts/viajeDetalle';

/**
 * Versión del esquema del almacén. Cambiarla descarta lo guardado (tarea 3).
 * v2: se agrega `cambios_estado` para los reportes por estado.
 */
export const VERSION_ALMACEN_VIAJES = 2;

/**
 * Un cambio de estado de un viaje. Los reportes por estado cuentan estos cambios,
 * no los viajes actuales (respuesta de Producto a la Pregunta 9, E8-T17).
 */
export interface CambioEstadoMock {
  viaje_id: string;
  estado: string;
  ts: string;
}

/** Estados terminales (ADR 19; DEC-135 #5). Liberan escolta y rechazan emergencias. */
export const ESTADOS_TERMINALES_MOCK: readonly EstadoViaje[] = [
  EstadoViaje.RechazadoPorAi27,
  EstadoViaje.RechazadoPorCliente,
  EstadoViaje.Cerrado,
  EstadoViaje.Cancelado,
];

/** Estados que exigen escolta reservada (requisito 7.3). */
export const ESTADOS_CON_ESCOLTA_MOCK: readonly string[] = [
  EstadoViaje.Asignado,
  EstadoViaje.AptoParaSalida,
  EstadoViaje.EnEmbarque,
  EstadoViaje.PatrullaEnCamino,
  EstadoViaje.EnTransito,
  EstadoViaje.EnDestino,
  EstadoViaje.EnDescarga,
];

/** `true` si el estado del viaje es terminal. */
export function esEstadoTerminalMock(estado: string): boolean {
  return ESTADOS_TERMINALES_MOCK.some((terminal) => terminal === estado);
}

/** Estado completo de un viaje en el mock. */
export interface RegistroViaje {
  /** Viaje, estado, destinos, ETA, fecha y hora, y `condiciones_activas`. */
  detalle: ViajeDetalle;
  /** `null` = ficha aún no capturada. */
  ficha: FichaTecnica | null;
  expediente: { origen: string; destino: string };
  /** Histórico append-only. `condiciones_activas` con INCIDENCIA se deriva de las abiertas. */
  incidencias: Incidencia[];
  /** Ids de unidad reservadas para el viaje. */
  escolta: string[];
  emergencias: EmergenciaViaje[];
  creado_en: string;
  /** Marca de cierre o rechazo para reportes; `null` mientras el viaje no es terminal. */
  cerrado_en: string | null;
}

/** Estado único del mock de viajes. */
export interface AlmacenViajes {
  version: number;
  /** Clave: id del viaje (`VJ-10xx`, o `VJ-2xxx` si se crea en la sesión). */
  viajes: Record<string, RegistroViaje>;
  /** Bandeja de Reacción. */
  casos: EmergenciaReaccion[];
  /** Historial de cambios de estado, para los reportes por estado. */
  cambios_estado: CambioEstadoMock[];
  siguienteId: { viaje: number; caso: number; incidencia: number; estadia: number };
}

/** Viajes que existían antes del almacén. Se conservan sus ids para no romper pruebas. */
const VIAJES_HISTORICOS = [
  'VJ-1001',
  'VJ-1002',
  'VJ-1003',
  'VJ-1004',
  'VJ-1005',
  'VJ-1006',
  'VJ-1007',
  'VJ-1008',
  'VJ-1009',
  'VJ-1010',
] as const;

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

function ahora(desplazamientoMs: number): string {
  return new Date(Date.now() + desplazamientoMs).toISOString();
}

function registroBase(
  id: string,
  estado: EstadoViaje,
  origen: string,
  destinos: { nombre: string; numero_envio: string }[],
  creadoHaceMs: number,
  extra: Partial<Pick<RegistroViaje, 'ficha' | 'incidencias' | 'escolta'>> & {
    fechaHoraEnMs?: number | null;
    etaEnMs?: number | null;
    cerradoHaceMs?: number | null;
    condiciones?: ViajeDetalle['condiciones_activas'];
  } = {},
): RegistroViaje {
  const creado_en = ahora(-creadoHaceMs);
  const terminal = ESTADOS_TERMINALES_MOCK.includes(estado);
  const fechaHora = extra.fechaHoraEnMs;
  const eta = extra.etaEnMs;
  const cerrado = extra.cerradoHaceMs;
  const destinoFinal = destinos.at(-1)?.nombre ?? '';

  return {
    detalle: {
      viaje: {
        id,
        estado,
        origen,
        destinos,
        ...(fechaHora !== undefined &&
          fechaHora !== null && { fecha_hora_servicio: ahora(fechaHora) }),
        ...(eta !== undefined && eta !== null && { eta_estimado: ahora(eta) }),
        creado_en,
      },
      condiciones_activas: extra.condiciones ?? [],
    },
    ficha: extra.ficha ?? null,
    expediente: { origen, destino: destinoFinal },
    incidencias: extra.incidencias ?? [],
    escolta: extra.escolta ?? [],
    emergencias: [],
    creado_en,
    cerrado_en: terminal && cerrado !== undefined && cerrado !== null ? ahora(-cerrado) : null,
  };
}

/** Viajes históricos del mock, con sus datos de demo. */
function viajesHistoricos(): Record<string, RegistroViaje> {
  return {
    'VJ-1001': registroBase(
      'VJ-1001',
      EstadoViaje.EnTransito,
      'Av. Paseo de la Reforma 505, México CDMX',
      [
        { nombre: 'Centro de Distribución A', numero_envio: 'ENV-1001-A' },
        { nombre: 'Oficina Regional B', numero_envio: 'ENV-1001-B' },
      ],
      24 * HORA,
      {
        fechaHoraEnMs: HORA,
        ficha: {
          viaje_id: 'VJ-1001',
          tracto: {
            placas: 'ABC-123',
            economico: 'TR-27',
            marca: 'Kenworth',
            modelo: 'T680',
            color: 'Blanco',
          },
          contenedores: [],
          gps_ids: [],
        },
        escolta: ['UN-1001'],
      },
    ),
    'VJ-1002': registroBase(
      'VJ-1002',
      EstadoViaje.Solicitado,
      'Barrio Antiguo, Monterrey',
      [{ nombre: 'Almacén Central Monterrey', numero_envio: 'ENV-1002-A' }],
      HORA,
      { fechaHoraEnMs: 2 * HORA },
    ),
    'VJ-1003': registroBase(
      'VJ-1003',
      EstadoViaje.Asignado,
      'Centro Histórico, Guadalajara',
      [{ nombre: 'Sucursal Guadalajara', numero_envio: 'ENV-1003-A' }],
      2 * HORA,
      { fechaHoraEnMs: 90 * MINUTO },
    ),
    'VJ-1004': registroBase(
      'VJ-1004',
      EstadoViaje.EnDestino,
      'Centro de Querétaro',
      [
        { nombre: 'Punto de Entrega 1', numero_envio: 'ENV-1004-A' },
        { nombre: 'Punto de Entrega 2', numero_envio: 'ENV-1004-B' },
      ],
      3 * HORA,
      { fechaHoraEnMs: 30 * MINUTO, etaEnMs: 30 * MINUTO },
    ),
    'VJ-1005': registroBase(
      'VJ-1005',
      EstadoViaje.Aprobado,
      'Zócalo de Puebla',
      [{ nombre: 'Centro de Operaciones Puebla', numero_envio: 'ENV-1005-A' }],
      30 * MINUTO,
      { fechaHoraEnMs: 3 * HORA },
    ),
    'VJ-1006': registroBase(
      'VJ-1006',
      EstadoViaje.EnTransito,
      'Centro Toluca',
      [{ nombre: 'Depósito Toluca', numero_envio: 'ENV-1006-A' }],
      90 * MINUTO,
      { fechaHoraEnMs: 45 * MINUTO },
    ),
    'VJ-1007': registroBase(
      'VJ-1007',
      EstadoViaje.Cerrado,
      'Centro de León',
      [{ nombre: 'Estación Final León', numero_envio: 'ENV-1007-A' }],
      2 * 24 * HORA,
      { fechaHoraEnMs: -HORA, etaEnMs: -30 * MINUTO, cerradoHaceMs: 30 * MINUTO },
    ),
    'VJ-1008': registroBase(
      'VJ-1008',
      EstadoViaje.EnDescarga,
      'Puerto de Veracruz',
      [{ nombre: 'Zona de Descarga Veracruz', numero_envio: 'ENV-1008-A' }],
      3 * 24 * HORA,
      { fechaHoraEnMs: -30 * MINUTO, etaEnMs: 0 },
    ),
    // Solicitud sin fecha y hora: el guardia de aprobación (E8-T9) la bloquea.
    'VJ-1009': registroBase(
      'VJ-1009',
      EstadoViaje.Solicitado,
      'Zona Centro, Tijuana',
      [{ nombre: 'Bodega Frontera Tijuana', numero_envio: 'ENV-1009-A' }],
      20 * MINUTO,
    ),
    // Incidencia abierta: habilita el cierre anticipado (E8-T14).
    'VJ-1010': registroBase(
      'VJ-1010',
      EstadoViaje.EnTransito,
      'Carretera 57, San Luis Potosí',
      [{ nombre: 'Centro de Distribución Bajío', numero_envio: 'ENV-1010-A' }],
      2 * HORA,
      {
        fechaHoraEnMs: -30 * MINUTO,
        condiciones: [{ tipo: 'INCIDENCIA', abierta_en: ahora(-15 * MINUTO) }],
        incidencias: [
          {
            id: 'INC-1010',
            viaje_id: 'VJ-1010',
            tipo_interno: 'Desvío de Ruta',
            estado: 'en_atencion',
            abierta_en: ahora(-15 * MINUTO),
            resuelta_en: null,
          },
        ],
      },
    ),
  };
}

/** Unidad de escolta de cada viaje de la semilla que lo requiere. */
const ESCOLTA_SEMILLA: Record<string, string> = {
  'VJ-1001': 'UN-1001',
  'VJ-1003': 'UN-1003',
  'VJ-1004': 'UN-1004',
  'VJ-1006': 'UN-1005',
  'VJ-1008': 'UN-1006',
  'VJ-1010': 'UN-1007',
  'VJ-1013': 'UN-1008',
  'VJ-1014': 'UN-1009',
  'VJ-1015': 'UN-1010',
};

/**
 * Semilla: los viajes históricos más un viaje por cada estado del enum que no
 * cubren. Se recorre `Object.values(EstadoViaje)`, así un estado nuevo del contrato
 * aparece en el mock sin tocar esta lista.
 */
export function crearAlmacenSemilla(): AlmacenViajes {
  const viajes = viajesHistoricos();
  const cubiertos = new Set<string>(Object.values(viajes).map((r) => r.detalle.viaje.estado));
  const faltantes = (Object.values(EstadoViaje) as EstadoViaje[]).filter(
    (estado) => !cubiertos.has(estado),
  );

  let siguienteViaje = 1011;
  for (const estado of faltantes) {
    const id = `VJ-${siguienteViaje++}`;
    viajes[id] = registroBase(
      id,
      estado,
      `Origen de cobertura (${estado})`,
      [{ nombre: `Destino de cobertura (${estado})`, numero_envio: `ENV-${id}-A` }],
      3 * HORA,
      { fechaHoraEnMs: 2 * HORA, cerradoHaceMs: 20 * MINUTO },
    );
  }

  // Emergencias de demo. Cada caso queda ligado a un viaje; el detalle de Reacción
  // sale del viaje (EmergenciaReaccion no tiene viaje_id, DEC-121 #2).
  const casos: EmergenciaReaccion[] = [
    {
      id: 'em-001',
      estado: 'abierta',
      origen: 'cliente',
      version_reclamo: 1,
      reclamo_activo: null,
      activada_en: '2026-11-04T08:10:00Z',
    },
    {
      id: 'em-002',
      estado: 'en_atencion',
      origen: 'operacion',
      version_reclamo: 3,
      reclamo_activo: {
        id: 'rc-002',
        conversacion_id: 'em-002',
        responsable_id: 'sujeto-reaccion-otro',
        version: 3,
        abierto_en: '2026-11-04T07:50:00Z',
      },
      activada_en: '2026-11-04T07:45:00Z',
    },
    {
      id: 'em-003',
      estado: 'resuelta',
      origen: 'operacion',
      version_reclamo: 2,
      reclamo_activo: null,
      activada_en: '2026-11-03T22:00:00Z',
      resuelta_en: '2026-11-03T23:00:00Z',
    },
    {
      id: 'em-004',
      estado: 'abierta',
      origen: 'operacion',
      version_reclamo: 1,
      reclamo_activo: null,
      activada_en: '2026-11-04T09:00:00Z',
    },
  ];
  const ligas: Record<string, string> = {
    'em-001': 'VJ-1010',
    'em-002': 'VJ-1006',
    'em-003': 'VJ-1001',
    'em-004': 'VJ-1001',
  };
  // Escolta obligatoria desde ASIGNADO (requisito 7.3). Cada unidad va en un solo
  // viaje no terminal (requisito 7.1). Las unidades existen en `semillaUnidades`.
  for (const [viajeId, unidad] of Object.entries(ESCOLTA_SEMILLA)) {
    const registro = viajes[viajeId];
    if (registro) registro.escolta = [unidad];
  }

  for (const caso of casos) {
    const viajeId = ligas[caso.id];
    const registro = viajeId ? viajes[viajeId] : undefined;
    if (!registro) continue;
    registro.emergencias = [
      ...registro.emergencias,
      { id: caso.id, estado: caso.estado, activada_en: caso.activada_en },
    ];
  }

  return {
    version: VERSION_ALMACEN_VIAJES,
    viajes,
    casos,
    // Semilla: cada viaje cuenta una vez, en el estado en que está, desde su alta.
    cambios_estado: Object.values(viajes).map((registro) => ({
      viaje_id: registro.detalle.viaje.id,
      estado: registro.detalle.viaje.estado,
      ts: registro.creado_en,
    })),
    siguienteId: { viaje: 2000, caso: 1, incidencia: 2000, estadia: 2000 },
  };
}

/** Ids de los viajes históricos, expuestos para pruebas que los necesitan. */
export const IDS_VIAJES_HISTORICOS: readonly string[] = VIAJES_HISTORICOS;

/** Clave de `localStorage`, versionada con el esquema del almacén. */
export const CLAVE_ALMACEN_VIAJES = `ai27.mock.almacen-viajes.v${VERSION_ALMACEN_VIAJES}`;

/**
 * Solo en modo mock se lee y escribe `localStorage` (requisito 9.5). Es la misma
 * condición que arranca MSW.
 */
function persistenciaActiva(): boolean {
  return import.meta.env.VITE_ENABLE_MOCKS === 'true' && typeof localStorage !== 'undefined';
}

/** Lee y valida lo guardado. Devuelve `null` si falta, no es JSON o es de otra versión. */
function leerGuardado(): AlmacenViajes | null {
  try {
    const crudo = localStorage.getItem(CLAVE_ALMACEN_VIAJES);
    if (crudo === null) return null;
    const dato: unknown = JSON.parse(crudo);
    if (
      typeof dato !== 'object' ||
      dato === null ||
      (dato as AlmacenViajes).version !== VERSION_ALMACEN_VIAJES ||
      typeof (dato as AlmacenViajes).viajes !== 'object' ||
      !Array.isArray((dato as AlmacenViajes).casos)
    ) {
      return null;
    }
    return dato as AlmacenViajes;
  } catch {
    return null;
  }
}

function escribirGuardado(valor: AlmacenViajes): void {
  try {
    localStorage.setItem(CLAVE_ALMACEN_VIAJES, JSON.stringify(valor));
  } catch {
    // Cuota llena o almacenamiento bloqueado: el mock sigue en memoria.
  }
}

let almacen: AlmacenViajes =
  (persistenciaActiva() ? leerGuardado() : null) ?? crearAlmacenSemilla();

/** Almacén en memoria. Las mutaciones de las tareas 5 a 7 se harán sobre él. */
export function obtenerAlmacen(): AlmacenViajes {
  return almacen;
}

/**
 * Reemplaza el almacén completo y lo guarda. Toda mutación pasa por aquí, así que
 * cada cambio se persiste en una sola escritura.
 */
export function reemplazarAlmacen(siguiente: AlmacenViajes): void {
  almacen = siguiente;
  if (persistenciaActiva()) escribirGuardado(almacen);
}

/** Vuelve el almacén a la semilla y borra lo guardado (requisito 9.4, para QA). */
export function reiniciarAlmacenMock(): void {
  almacen = crearAlmacenSemilla();
  if (persistenciaActiva()) {
    try {
      localStorage.removeItem(CLAVE_ALMACEN_VIAJES);
    } catch {
      // Sin acceso a almacenamiento no hay nada que borrar.
    }
    escribirGuardado(almacen);
  }
}
