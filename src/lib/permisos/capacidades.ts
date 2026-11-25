/*
 * Matriz de capacidades del panel interno (spec `afinacion-roles-modulo-a-modulo`).
 *
 * Lista blanca: cada capacidad nombra los roles que la tienen. Un rol que no
 * aparece la niega, incluido cualquier rol futuro. `administrador` se agrega a
 * toda capacidad salvo las de `EXCEPCIONES_ADM`, que declaran su fuente.
 *
 * Es afordancia de interfaz: oculta o muestra. La autoridad real es el `403` y
 * el `404` del BFF. La política decide solo por rol; nunca calcula alcance.
 */
import { Rol } from './roles';
import { EXCEPCIONES_ADM } from './excepciones';

const JO = Rol.JefeOperativo;
const MON = Rol.Monitorista;
const SUP = Rol.Supervisor;
const COO = Rol.Coordinador;
const ADM = Rol.Administrador;
const EJE = Rol.Ejecutivo;
const REA = Rol.Reaccion;
const COT = Rol.Cotizacion;

/** Monitorista y los roles que heredan sus facultades (DEC-149 #6). */
const MONITOREO = [MON, SUP, COO] as const;

/**
 * Roles de cada capacidad **sin** el administrador, que se agrega aparte.
 * Una lista vacía significa "solo el administrador".
 */
const BASE = {
  // M1: entradas de menú y páginas
  'panel.jefeOperativo': [JO],
  'viajes.listar': [JO, ...MONITOREO],
  'viaje.ver': [JO, ...MONITOREO],
  'reportes.ver': MONITOREO,
  'administracion.usuarios': [],
  'administracion.organizaciones': [],

  // M2 y M3: bandeja y alta
  'viaje.crear': [JO],
  'clientes.listar': [JO],
  'alcance.leerPropio': MONITOREO,

  // M4: acciones del detalle
  'viaje.asignarEscolta': [JO],
  'viaje.marcarApto': [JO, ...MONITOREO],
  'viaje.avanzar': MONITOREO,
  'viaje.cerrar': [JO],
  'viaje.eta': MONITOREO,
  'viaje.fechaHora': [JO],

  // M5: ficha técnica y bitácora
  'viaje.ficha.ver': [JO, ...MONITOREO],
  'viaje.ficha.editar': MONITOREO,
  'viaje.bitacora.registrar': MONITOREO,

  // M6: histórico
  'viaje.historico.ver': [JO, ...MONITOREO],
  'viaje.estadia.operar': MONITOREO,
  'viaje.incidencia.abrir': MONITOREO,
  'viaje.incidencia.resolver': [SUP, COO],

  // M7 y M8: expediente y dashboard
  'monitoreo.consultar': MONITOREO,
  'monitoreo.dashboard': MONITOREO,

  // M9: emergencias
  'emergencia.verDeViaje': MONITOREO,
  'emergencia.activar': MONITOREO,
  'emergencia.anotar': MONITOREO,
  'emergencia.cerrar': MONITOREO,
  'emergencia.bandeja': [REA, SUP, COO],
  'emergencia.reclamar': [REA],
  'emergencia.resolver': [REA],
  'emergencia.devolver': [REA, SUP, COO],
  'emergencia.transferir': [REA, SUP, COO],
  /** Devolver o transferir un caso que atiende otro responsable. */
  'emergencia.gestionarAjeno': [SUP, COO],

  // M10: conversaciones del viaje
  'conversacion.leer': [EJE, SUP, COO],
  'conversacion.operar': [EJE],

  // M11: roster y alcance
  'roster.ver': [JO],
  'roster.unidad.editar': [JO],
  'alcance.clientes.fijar': [JO],
  'alcance.subordinados.fijar': [],

  // M14: solicitudes (el JO solo ve las PAGADO y sin datos comerciales: lo filtra el BFF)
  'solicitud.listar': [JO, COT],
  'solicitud.ver': [JO, COT],
  'solicitud.verComercial': [COT],
  'solicitud.cotizar': [COT],
  'solicitud.reprogramar': [COT],
  'solicitud.confirmarPago': [COT],
  'solicitud.revertirPago': [],
  'solicitud.aprobar': [JO],
  'solicitud.rechazar': [JO],
  'solicitud.conversacion': [COT],

  // M13: catálogos
  'catalogos.ver': [JO, COO],
  'catalogos.escribir': [COO],
} as const satisfies Record<string, readonly Rol[]>;

export type Capacidad = keyof typeof BASE;

function conAdministrador(capacidad: Capacidad): readonly Rol[] {
  const roles: readonly Rol[] = BASE[capacidad];
  return capacidad in EXCEPCIONES_ADM ? roles : [...roles, ADM];
}

/** Roles que tienen cada capacidad, con la regla del administrador ya aplicada. */
export const MATRIZ: Readonly<Record<Capacidad, readonly Rol[]>> = Object.freeze(
  Object.fromEntries(
    (Object.keys(BASE) as Capacidad[]).map((capacidad) => [capacidad, conAdministrador(capacidad)]),
  ) as Record<Capacidad, readonly Rol[]>,
);

export const CAPACIDADES = Object.keys(BASE) as readonly Capacidad[];
