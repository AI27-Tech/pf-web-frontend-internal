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
import {
  ESTADOS_CON_ESCOLTA_MOCK,
  ESTADOS_TERMINALES_MOCK,
  obtenerAlmacen,
  reemplazarAlmacen,
  type AlmacenViajes,
  type RegistroViaje,
} from './almacen-viajes';
import type { ViajeResumen, PaginaViajesResumen, CrearViajeEntrada } from '@/lib/contracts/viajes';
import type { Cliente, PaginaClientes } from '@/lib/contracts/clientes';
import type { ViajeDetalle } from '@/lib/contracts/viajeDetalle';
import type { FichaTecnica } from '@/lib/contracts/fichaTecnica';
import type { DescargaViaje } from '@/lib/contracts/expediente';
import type { FilaViaje, ReporteEstados, ReporteViajes } from '@/lib/contracts/reportes';
import type {
  Adjunto,
  DescargaAdjunto,
  IntencionSubidaAdjunto,
  IntencionSubidaAdjuntoEntrada,
  PaginaAdjuntos,
} from '@/lib/contracts/adjuntos';
import type { FichaTecnicaEntrada, DispositivoGps } from '@/lib/contracts/fichaTecnica';
import type { Asignacion, AptitudRecurso } from '@/lib/contracts/viajeDetalle';
import type { Unidad } from '@/lib/contracts/unidades';
import type {
  Conversacion as ConversacionWire,
  EnviarMensajeInternaEntrada as EnviarMensajeInternaEntradaWire,
  Mensaje as MensajeWire,
  PaginaMensajes as PaginaMensajesWire,
  Reclamo as ReclamoWire,
  TrabajoBandeja as TrabajoBandejaWire,
} from '@/lib/contracts/conversaciones';

/** Contraseña común de las siete cuentas demo. Decisión confirmada por el usuario. */
const CONTRASENA_DEMO = 'demo1234';

/**
 * Catálogo de cuentas demo: una fila por rol interno. Es la única fuente de
 * verdad. El usuario, el `sub` y el `sesion_id` se calculan a partir de la cuenta.
 */
export const CUENTAS_DEMO = [
  { cuenta: 'operador', rol: Rol.JefeOperativo },
  { cuenta: 'monitorista', rol: Rol.Monitorista },
  { cuenta: 'supervisor', rol: Rol.Supervisor },
  { cuenta: 'coordinador', rol: Rol.Coordinador },
  { cuenta: 'ejecutivo', rol: Rol.Ejecutivo },
  { cuenta: 'reaccion', rol: Rol.Reaccion },
  { cuenta: 'administrador', rol: Rol.Administrador },
] as const;

/** Nombre de una cuenta del catálogo, por ejemplo `operador`. */
export type CuentaDemo = (typeof CUENTAS_DEMO)[number]['cuenta'];

/** Fila del catálogo: `{ cuenta, rol }`. */
export type FilaCuentaDemo = (typeof CUENTAS_DEMO)[number];

/** Claim `sub` de la cuenta demo, por ejemplo `usr-demo-operador`. */
export function sujetoDeCuenta(cuenta: CuentaDemo): string {
  return `usr-demo-${cuenta}`;
}

/** Claim `sesion_id` de la cuenta demo. No cambia al renovar la sesión. */
export function sesionDeCuenta(cuenta: CuentaDemo): string {
  return `ses-demo-${cuenta}`;
}

/**
 * Busca la cuenta por usuario (`<cuenta>@demo.ai27`) y contraseña. La comparación
 * distingue mayúsculas y minúsculas. Devuelve `undefined` si no hay coincidencia.
 */
export function cuentaPorCredenciales(usuario: string, contrasena: string): CuentaDemo | undefined {
  return CUENTAS_DEMO.find(
    ({ cuenta }) => usuario === `${cuenta}@demo.ai27` && contrasena === CONTRASENA_DEMO,
  )?.cuenta;
}

/** Fila del catálogo para un rol. Supone una cuenta por rol. */
export function cuentaPorRol(rol: Rol): FilaCuentaDemo | undefined {
  return CUENTAS_DEMO.find((fila) => fila.rol === rol);
}

/** Forma del `refresh_token` demo: `mock.refresh.<cuenta>.<uuid>`. */
const PATRON_REFRESH_DEMO = /^mock\.refresh\.([a-z]+)\.[0-9a-f-]{36}$/;

/** Extrae la cuenta del `refresh_token`. Devuelve `undefined` si el token no es del catálogo. */
export function cuentaPorRefreshToken(token: string): CuentaDemo | undefined {
  const coincidencia = PATRON_REFRESH_DEMO.exec(token);
  if (!coincidencia) return undefined;
  return CUENTAS_DEMO.find(({ cuenta }) => cuenta === coincidencia[1])?.cuenta;
}

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

/** Tenant de las cuentas demo. Todas pertenecen al mismo tenant. */
const TENANT_DEMO = 'tenant-demo';

/** Rol de la cuenta demo. Lanza un error si la cuenta no está en el catálogo. */
function rolDeCuenta(cuenta: CuentaDemo): Rol {
  const fila = CUENTAS_DEMO.find((candidata) => candidata.cuenta === cuenta);
  if (!fila) throw new Error(`Cuenta demo desconocida: ${cuenta}`);
  return fila.rol;
}

/**
 * Construye un access_token mock con forma de JWT (header.payload.firma) para una
 * cuenta demo. La firma es de mentira: el mock no verifica nada. El payload es un
 * JSON de claims que la app puede decodificar. Los handlers que aplican facultades
 * leen el rol de aquí, como el `bff` real.
 */
function accessTokenDeCuenta(cuenta: CuentaDemo, rol: Rol): string {
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      sub: sujetoDeCuenta(cuenta),
      tenant_id: TENANT_DEMO,
      rol,
      sesion_id: sesionDeCuenta(cuenta),
    }),
  );
  return `${header}.${payload}.firma-de-mentira`;
}

/**
 * Construye un access_token mock para el rol. Toma la cuenta del rol con
 * `cuentaPorRol`, así que `sub` y `sesion_id` salen de esa cuenta. Lanza un error si
 * ningún rol de la cuenta coincide con el pedido.
 */
export function mockAccessToken(rol: Rol = Rol.JefeOperativo): string {
  const fila = cuentaPorRol(rol);
  if (!fila) throw new Error(`No hay cuenta demo para el rol: ${rol}`);
  return accessTokenDeCuenta(fila.cuenta, fila.rol);
}

/**
 * Construye una respuesta de sesión en forma de wire (contrato `Sesion`) para una
 * cuenta demo. `sesion_id` y `access_token` salen de la cuenta. `refresh_token` lleva
 * la cuenta (`mock.refresh.<cuenta>.<uuid>`) para que `POST /sesion/refresh` la
 * identifique. Los tokens son de mentira a propósito: no hay verificación real detrás,
 * solo desbloquean la UI.
 */
export function createSessionWire(cuenta: CuentaDemo): SesionWire {
  return {
    sesion_id: sesionDeCuenta(cuenta),
    access_token: accessTokenDeCuenta(cuenta, rolDeCuenta(cuenta)),
    refresh_token: `mock.refresh.${cuenta}.${crypto.randomUUID()}`,
    expira_en: new Date(Date.now() + 3600_000).toISOString(),
  };
}

/*
 * Listado operativo (E8-T7). Las filas salen del almacén (`almacen-viajes.ts`) y
 * no hay una copia propia: el estado se guarda una sola vez.
 */

/** Resumen de cada viaje del almacén, en el orden en que se creó. */
function resumenesViajes(): ViajeResumen[] {
  return Object.values(obtenerAlmacen().viajes).map(({ detalle }) => ({
    id: detalle.viaje.id,
    estado: detalle.viaje.estado,
    origen: detalle.viaje.origen,
  }));
}

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
  const todos = resumenesViajes();
  const filtrados = estado ? todos.filter((v) => v.estado === estado) : todos;

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
 * Los viajes viven en el almacén (`almacen-viajes.ts`). Las funciones de este
 * bloque conservan su firma y leen o escriben el registro del viaje.
 */

/** Registro del viaje en el almacén, o `undefined` si no existe. */
function registroViaje(id: string): RegistroViaje | undefined {
  return obtenerAlmacen().viajes[id];
}

/** Aplica una mutación sobre el almacén y la persiste con una sola escritura. */
function mutarAlmacen(mutacion: (almacen: AlmacenViajes) => void): void {
  const almacen = obtenerAlmacen();
  mutacion(almacen);
  reemplazarAlmacen(almacen);
}

/** Mutación de un solo viaje. No hace nada si el viaje no existe. */
function mutarRegistro(id: string, mutacion: (registro: RegistroViaje) => void): void {
  mutarAlmacen((almacen) => {
    const registro = almacen.viajes[id];
    if (registro) mutacion(registro);
  });
}

/** Recupera la ficha del viaje; null representa una ficha aún no capturada. */
export function obtenerFichaMock(id: string): FichaTecnica | null {
  return registroViaje(id)?.ficha ?? null;
}

/** Catálogo demo de GPS; incluye un inactivo para demostrar el filtro contractual. */
const GPS_DEMO: readonly DispositivoGps[] = [
  { id: 'GPS-1001', identificador: 'GPS-ALPHA', activo: true },
  { id: 'GPS-1002', identificador: 'GPS-BETA', activo: true },
  { id: 'GPS-1003', identificador: 'GPS-INACTIVO', activo: false },
];

/** Recupera la página del catálogo registrado. */
export function listarGpsMock() {
  return { items: [...GPS_DEMO], cursor_siguiente: null };
}

/** Guarda la forma PATCH de la ficha en el almacén. */
export function guardarFichaMock(id: string, entrada: FichaTecnicaEntrada): FichaTecnica | null {
  if (!registroViaje(id)) return null;

  const actual = registroViaje(id)?.ficha ?? { viaje_id: id };
  const siguiente: FichaTecnica = { ...actual };
  if ('tracto' in entrada) siguiente.tracto = entrada.tracto;
  if ('contenedores' in entrada) siguiente.contenedores = entrada.contenedores;
  if ('gps_ids' in entrada) siguiente.gps_ids = entrada.gps_ids;
  mutarRegistro(id, (registro) => {
    registro.ficha = siguiente;
  });
  return siguiente;
}

/** Crea un viaje APROBADO en el almacén y deja listo su detalle. */
export function crearViajeMock(entrada: CrearViajeEntrada): ViajeResumen {
  const creado_en = new Date().toISOString();
  let id = '';
  mutarAlmacen((almacen) => {
    id = `VJ-${almacen.siguienteId.viaje++}`;
    almacen.viajes[id] = {
      detalle: {
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
      },
      ficha: null,
      expediente: { origen: entrada.origen, destino: entrada.destinos.at(-1)?.nombre ?? '' },
      incidencias: [],
      escolta: [],
      emergencias: [],
      creado_en,
      cerrado_en: null,
    };
    almacen.cambios_estado.push({ viaje_id: id, estado: EstadoViaje.Aprobado, ts: creado_en });
  });
  return { id, estado: EstadoViaje.Aprobado, origen: entrada.origen };
}

/**
 * Recupera el detalle completo de un viaje por ID.
 *
 * Devuelve `null` si el viaje no existe en el almacén.
 */
export function obtenerDetalleViajeMock(id: string): ViajeDetalle | null {
  return registroViaje(id)?.detalle ?? null;
}

/**
 * Almacena una mutación de estado del viaje (transición).
 *
 * Valida que la transición sea permitida; si no, devuelve `false` y no cambia el
 * almacén. Si es válida, actualiza el estado y devuelve `true`.
 */
export function transicionarViajeMock(id: string, a_estado: string): boolean {
  const registro = registroViaje(id);
  if (!registro) return false;

  // Validación directa contra la tabla de transiciones (sin confiar en el tipo)
  const valido = TRANSICIONES_VIAJE.some(
    ([desde, hacia]) => desde === registro.detalle.viaje.estado && hacia === a_estado,
  );
  if (!valido) return false;
  // Sin escolta reservada no se entra a un estado que la exige (requisito 7.3).
  if (ESTADOS_CON_ESCOLTA_MOCK.includes(a_estado) && registro.escolta.length === 0) return false;

  mutarAlmacen((almacen) => {
    const registro = almacen.viajes[id];
    if (!registro) return;
    const ts = new Date().toISOString();
    registro.detalle.viaje.estado = a_estado;
    almacen.cambios_estado.push({ viaje_id: id, estado: a_estado, ts });
    if (ESTADOS_TERMINALES_MOCK.some((terminal) => terminal === a_estado)) {
      registro.cerrado_en = ts;
      // Al entrar en terminal se libera la escolta (requisito 7.2).
      registro.escolta = [];
    }
  });
  return true;
}

/**
 * Fija el ETA estimado del viaje.
 *
 * Si el viaje está en un estado terminal, devuelve `false` y no cambia el almacén.
 */
export function fijarEtaMock(id: string, eta_estimado: string): boolean {
  const registro = registroViaje(id);
  if (!registro) return false;
  if (ESTADOS_TERMINALES_MOCK.some((terminal) => terminal === registro.detalle.viaje.estado)) {
    return false;
  }

  mutarRegistro(id, (registro) => {
    registro.detalle.viaje.eta_estimado = eta_estimado;
  });
  return true;
}

/**
 * Completa/edita la fecha/hora del servicio del viaje (E8-T9).
 *
 * Simula la operación real `completarFechaHora` del `bff` (contrato tracer.15).
 * Devuelve `false` si el viaje no existe o si la fecha/hora es inválida.
 */
export function completarFechaHoraMock(id: string, fecha_hora_servicio: string): boolean {
  if (!registroViaje(id)) return false;

  if (typeof fecha_hora_servicio !== 'string' || fecha_hora_servicio.trim().length === 0) {
    return false;
  }

  mutarRegistro(id, (registro) => {
    registro.detalle.viaje.fecha_hora_servicio = fecha_hora_servicio;
  });
  return true;
}

/** Roster demo de la asignación: la aptitud de `asignarEscoltaMock` sale de aquí. */
export const UNIDADES_DEMO: readonly Unidad[] = [
  {
    id: 'UN-1001',
    vehiculo_id: 'VEH-2001',
    custodios_ids: ['CUS-3001', 'CUS-3002'],
    tipo: 'patrulla',
    activa: true,
    vehiculo: { economico: 'P-101', placas: 'ABC-1234' },
    custodios: [
      { id: 'CUS-3001', nombre: 'Juan Pérez' },
      { id: 'CUS-3002', nombre: 'Ana López' },
    ],
  },
  {
    id: 'UN-1002',
    vehiculo_id: 'VEH-2002',
    custodios_ids: ['CUS-3003'],
    tipo: 'moto',
    activa: false,
    vehiculo: { economico: 'M-07', placas: 'XYZ-987' },
    custodios: [{ id: 'CUS-3003', nombre: 'Luis Ramírez' }],
  },
];

function aptitudDemo(recurso: AptitudRecurso['recurso'], recurso_id: string): AptitudRecurso {
  return { recurso, recurso_id, estado: 'apto' };
}

/**
 * Aplica la asignación atómica al detalle demo y devuelve su resultado.
 * La aptitud aparece solo aquí, después de reservar, y nunca en el roster.
 */
export function asignarEscoltaMock(id: string, unidades_ids: string[]): Asignacion | null {
  if (!registroViaje(id)) return null;

  mutarAlmacen((almacen) => {
    const registro = almacen.viajes[id];
    if (!registro) return;
    registro.detalle.viaje.estado = EstadoViaje.Asignado;
    almacen.cambios_estado.push({
      viaje_id: id,
      estado: EstadoViaje.Asignado,
      ts: new Date().toISOString(),
    });
  });
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

// E8-T13: colecciones append-only del histórico operativo.
import type {
  EntradaBitacora,
  EntradaBitacoraEntrada,
  Estadia,
  EstadiaEntrada,
  Incidencia,
  IncidenciaEntrada,
  PaginaBitacora,
  PaginaEstadias,
  PaginaIncidencias,
} from '@/lib/contracts/historicoViaje';

const TAMANO_PAGINA_HISTORICO = 2;
const BITACORA_DEMO: EntradaBitacora[] = [
  {
    id: 'BIT-1001',
    viaje_id: 'VJ-1001',
    texto: 'Unidad en tránsito hacia el destino.',
    autor: 'Mesa de monitoreo',
    ts: new Date(Date.now() - 7_200_000).toISOString(),
  },
];
const ESTADIAS_DEMO: Estadia[] = [
  {
    id: 'EST-1001',
    viaje_id: 'VJ-1001',
    motivo: 'descanso',
    eje_autorizacion: 'autorizada',
    inicio: new Date(Date.now() - 3_600_000).toISOString(),
    cierre: null,
  },
];
let siguienteHistoricoDemo = 2000;

function paginaHistorico<T>(
  items: readonly T[],
  cursor: string | null,
): { items: T[]; cursor_siguiente: string | null } {
  const inicio = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
  const pagina = [...items.slice(inicio, inicio + TAMANO_PAGINA_HISTORICO)];
  const fin = inicio + pagina.length;
  return { items: pagina, cursor_siguiente: fin < items.length ? String(fin) : null };
}

export function listarBitacoraMock(viajeId: string, cursor: string | null): PaginaBitacora {
  return paginaHistorico(
    BITACORA_DEMO.filter((entrada) => entrada.viaje_id === viajeId),
    cursor,
  );
}

export function registrarEntradaBitacoraMock(
  viajeId: string,
  entrada: EntradaBitacoraEntrada,
): EntradaBitacora {
  const registrada: EntradaBitacora = {
    id: `BIT-${siguienteHistoricoDemo++}`,
    viaje_id: viajeId,
    texto: entrada.texto,
    autor: 'Operador demo',
    ts: new Date().toISOString(),
  };
  BITACORA_DEMO.push(registrada);
  return registrada;
}

/**
 * Expediente demo del viaje (E8-T17). Respeta `DescargaViaje` y su
 * `additionalProperties: false`: no incluye `cuenta_espejo` ni `clave_amago`.
 * Devuelve `null` si el viaje no existe.
 */
export function descargarViajeMock(viajeId: string): DescargaViaje | null {
  const registro = registroViaje(viajeId);
  if (!registro) return null;
  return {
    viaje_id: viajeId,
    ficha: {
      estado: 'en_curso',
      origen: registro.expediente.origen,
      destinos: registro.detalle.viaje.destinos,
      fecha_hora_servicio: registro.detalle.viaje.fecha_hora_servicio ?? null,
      tipo_servicio: 'escolta',
    },
    bitacora: BITACORA_DEMO.filter((entrada) => entrada.viaje_id === viajeId).map((entrada) => ({
      texto: entrada.texto,
      autor: entrada.autor,
      ts: entrada.ts,
    })),
    auditoria: [
      {
        entidad: 'viaje',
        actor: 'Operador demo',
        ts: new Date(Date.now() - 3_600_000).toISOString(),
      },
    ],
    generado_en: new Date().toISOString(),
  };
}

/** Origen simulado del almacenamiento de objetos. El `PUT` y la descarga van a este origen. */
export const ALMACEN_MOCK = 'https://almacenamiento.mock.ai27.local';

interface AdjuntoDemo {
  readonly viajeId: string;
  adjunto: Adjunto;
  lecturas: number;
}
const ADJUNTOS_DEMO: AdjuntoDemo[] = [];
let siguienteAdjuntoDemo = 1;

/**
 * Adjuntos demo (E8-T17, Bloque C). Simula el escáner: un adjunto pasa de `pendiente` a
 * `limpio` después de dos lecturas de la lista. Es comportamiento de mock, no del backend.
 */
export function listarAdjuntosMock(viajeId: string): PaginaAdjuntos {
  const items = ADJUNTOS_DEMO.filter((registro) => registro.viajeId === viajeId).map((registro) => {
    registro.lecturas += 1;
    if (registro.adjunto.estado_escaneo === 'pendiente' && registro.lecturas >= 2) {
      registro.adjunto = { ...registro.adjunto, estado_escaneo: 'limpio' };
    }
    return registro.adjunto;
  });
  return { items };
}

export function crearIntencionSubidaMock(
  viajeId: string,
  entrada: IntencionSubidaAdjuntoEntrada,
): IntencionSubidaAdjunto {
  const adjuntoId = `ADJ-${siguienteAdjuntoDemo++}`;
  ADJUNTOS_DEMO.push({
    viajeId,
    lecturas: 0,
    adjunto: {
      id: adjuntoId,
      viaje_id: viajeId,
      nombre: entrada.nombre,
      tipo_medio: entrada.tipo_medio,
      tamano_bytes: entrada.tamano_bytes,
      checksum_sha256: entrada.checksum_sha256,
      estado_escaneo: 'pendiente',
      creado_en: new Date().toISOString(),
    },
  });
  return {
    adjunto_id: adjuntoId,
    url_subida: `${ALMACEN_MOCK}/adjuntos/${adjuntoId}?firma=mock`,
    expira_en: new Date(Date.now() + 10 * 60_000).toISOString(),
  };
}

export function descargarAdjuntoMock(viajeId: string, adjuntoId: string): DescargaAdjunto | null {
  const registro = ADJUNTOS_DEMO.find(
    (candidato) => candidato.viajeId === viajeId && candidato.adjunto.id === adjuntoId,
  );
  if (!registro) return null;
  return {
    url_descarga: `${ALMACEN_MOCK}/descarga/${adjuntoId}?firma=mock`,
    expira_en: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
}

/**
 * Reportes demo del dashboard (E8-T17, Bloque B). Datos ficticios para desarrollo en modo
 * mock; no son cifras reales. Respetan la forma de `ReporteViajes` y `ReporteEstados`.
 */
export type VarianteFrescuraMock = 'fresca' | 'atrasada' | 'no_informada' | 'sin_datos';

/** Filas de reporte derivadas del almacén: una por viaje, con su estado actual. */
function filasReporte(): FilaViaje[] {
  return Object.values(obtenerAlmacen().viajes).map(({ detalle, creado_en, cerrado_en }) => ({
    viaje_id: detalle.viaje.id,
    estado: detalle.viaje.estado,
    creado_en,
    ...(cerrado_en && { cerrado_en }),
  }));
}

/** Frescura del reporte según la variante. `stale` se omite cuando el contrato lo omitiría. */
function frescuraMock(variante: VarianteFrescuraMock): {
  proyeccion_al: string | null;
  stale?: boolean;
} {
  const ahora = new Date().toISOString();
  switch (variante) {
    case 'atrasada':
      return { proyeccion_al: new Date(Date.now() - 3 * 3_600_000).toISOString(), stale: true };
    case 'fresca':
      return { proyeccion_al: ahora, stale: false };
    case 'no_informada':
      return { proyeccion_al: ahora };
    case 'sin_datos':
      return { proyeccion_al: null };
  }
}

/** Reporte de viajes. `en_curso` filtra a las filas sin `cerrado_en`; el rango no filtra. */
export function reporteViajesMock(
  consulta: { readonly enCurso: boolean },
  variante: VarianteFrescuraMock,
): ReporteViajes {
  const todas = filasReporte();
  const filas = consulta.enCurso ? todas.filter((fila) => fila.cerrado_en === undefined) : todas;
  return { filas, total: filas.length, ...frescuraMock(variante) };
}

/**
 * Distribución por estado: cuenta los CAMBIOS de estado del almacén, no los viajes que
 * están hoy en cada estado (respuesta de Producto a la Pregunta 9, E8-T17). El mock no
 * filtra por periodo. Solo aparecen los estados con al menos un cambio.
 */
export function reporteEstadosMock(variante: VarianteFrescuraMock): ReporteEstados {
  const porEstado = new Map<string, number>();
  for (const cambio of obtenerAlmacen().cambios_estado) {
    porEstado.set(cambio.estado, (porEstado.get(cambio.estado) ?? 0) + 1);
  }
  return {
    conteos: [...porEstado].map(([estado, conteo]) => ({
      estado,
      conteo,
      permanencia_promedio_seg: null,
    })),
    ...frescuraMock(variante),
  };
}

export function listarIncidenciasMock(viajeId: string, cursor: string | null): PaginaIncidencias {
  return paginaHistorico(
    (registroViaje(viajeId)?.incidencias ?? []).map((incidencia) => ({ ...incidencia })),
    cursor,
  );
}

export function abrirIncidenciaMock(
  viajeId: string,
  entrada: IncidenciaEntrada,
): Incidencia | 'condicion_ya_abierta' {
  const registro = registroViaje(viajeId);
  if (registro?.incidencias.some((incidencia) => incidencia.estado === 'en_atencion')) {
    return 'condicion_ya_abierta';
  }
  const incidencia: Incidencia = {
    id: `INC-${siguienteHistoricoDemo++}`,
    viaje_id: viajeId,
    tipo_interno: entrada.tipo_interno,
    estado: 'en_atencion',
    abierta_en: new Date().toISOString(),
    resuelta_en: null,
  };
  mutarRegistro(viajeId, (r) => {
    r.incidencias.push(incidencia);
    r.detalle.condiciones_activas = [
      ...r.detalle.condiciones_activas,
      { tipo: 'INCIDENCIA', abierta_en: incidencia.abierta_en },
    ];
  });
  return incidencia;
}

export function resolverIncidenciaMock(viajeId: string, incidenciaId: string): Incidencia | null {
  const existente = registroViaje(viajeId)?.incidencias.find((item) => item.id === incidenciaId);
  if (!existente) return null;
  const resuelta: Incidencia = {
    ...existente,
    estado: 'resuelta',
    resuelta_en: new Date().toISOString(),
  };
  mutarRegistro(viajeId, (registro) => {
    registro.incidencias = registro.incidencias.map((item) =>
      item.id === incidenciaId ? resuelta : item,
    );
    // La condición INCIDENCIA sale cuando ya no queda ninguna abierta.
    if (!registro.incidencias.some((item) => item.estado === 'en_atencion')) {
      registro.detalle.condiciones_activas = registro.detalle.condiciones_activas.filter(
        (condicion) => condicion.tipo !== 'INCIDENCIA',
      );
    }
  });
  return { ...resuelta };
}

export function listarEstadiasMock(viajeId: string, cursor: string | null): PaginaEstadias {
  return paginaHistorico(
    ESTADIAS_DEMO.filter((estadia) => estadia.viaje_id === viajeId),
    cursor,
  );
}

export function abrirEstadiaMock(viajeId: string, entrada: EstadiaEntrada): Estadia {
  const estadia: Estadia = {
    id: `EST-${siguienteHistoricoDemo++}`,
    viaje_id: viajeId,
    motivo: entrada.motivo,
    eje_autorizacion: entrada.eje_autorizacion,
    inicio: new Date().toISOString(),
    cierre: null,
  };
  ESTADIAS_DEMO.push(estadia);
  return estadia;
}

export function cerrarEstadiaMock(
  viajeId: string,
  estadiaId: string,
): Estadia | 'estadia_ya_cerrada' | null {
  const estadia = ESTADIAS_DEMO.find((item) => item.viaje_id === viajeId && item.id === estadiaId);
  if (!estadia) return null;
  if (estadia.cierre) return 'estadia_ya_cerrada';
  estadia.cierre = new Date().toISOString();
  return { ...estadia };
}

/*
 * E8-T15 — Bandeja de conversaciones.
 *
 * Estado en memoria del `bff` simulado para la superficie interna de bandeja
 * (`tracer.33`). Las formas salen de los tipos generados (`Conversacion`,
 * `Reclamo`, `Mensaje`, `TrabajoBandeja`, `PaginaMensajes`); no se inventan
 * campos. Reglas que respeta el mock (DEC-116 a DEC-122, PR #41 de `mensajeria`):
 *
 * - `version_reclamo` es monótona por conversación y sube al reclamar y al liberar.
 * - Liberar y marcar atendida por quien NO es el responsable activo responde 403
 *   `prohibido`; una versión vieja responde 409 `conflicto_version_reclamo`;
 *   marcar atendida sin reclamo activo responde 409.
 * - Responder NO marca atendida (DEC-117); un mensaje nuevo del cliente deja
 *   `atendida_en` vacío (DEC-122).
 * - Sin vista previa ni conteo de no leídos en la fila (DEC-118).
 * - El envío rechaza con 400 cualquier `motivo_override` (DEC-107).
 *
 * El estado es reiniciable (`reiniciarConversacionesMock`) para que las pruebas
 * sean deterministas. Los fallos se fuerzan con `forzarFalloConversaciones`.
 */

/** Sujeto de la sesión demo (claim `sub` del operador demo). */
export const SUJETO_CONVERSACIONES_DEMO: string = sujetoDeCuenta('operador');
/** Otra persona del pool: reclama, libera y responde en los escenarios de concurrencia. */
export const OTRO_RESPONSABLE_DEMO = 'usr-demo-2';
/** Cliente sin entrada en `listarClientes` (inactivo o fuera de alcance): el nombre no se resuelve. */
export const CLIENTE_SIN_NOMBRE_DEMO = 'CLI-9999';
/** Ids de las conversaciones demo. */
export const CONVERSACIONES_DEMO_IDS = {
  pool: 'CNV-1',
  mia: 'CNV-2',
  deOtro: 'CNV-3',
  atendida: 'CNV-4',
  soloLectura: 'CNV-5',
  historialLargo: 'CNV-6',
} as const;

const TAMANO_PAGINA_BANDEJA = 5;
const LIMITE_MENSAJES_POR_DEFECTO = 5;
const INSTANTE_BASE_CONVERSACIONES = Date.parse('2026-11-03T10:00:00.000Z');

/** Operaciones sobre las que se puede forzar un fallo. */
export type OperacionConversaciones =
  | 'bandeja'
  | 'bandejaCatchUp'
  | 'obtener'
  | 'listarMensajes'
  | 'enviar'
  | 'reclamar'
  | 'liberar'
  | 'atendida'
  | 'recibo';

/** Fallo forzado: respuesta HTTP con código de máquina, o caída de red. */
export type FalloConversaciones =
  | { readonly tipo: 'http'; readonly status: number; readonly codigo?: string }
  | { readonly tipo: 'red' };

export interface SolicitudConversaciones {
  readonly operacion: OperacionConversaciones;
  readonly conversacionId?: string;
  readonly cuerpo?: Record<string, unknown>;
  readonly query?: Record<string, string>;
}

export type ResultadoConversaciones<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly status: 400 | 403 | 404 | 409; readonly codigo: string };

interface ConversacionInterna {
  conversacion: ConversacionWire;
  /** Revisión de la colección en la que cambió por última vez. */
  revisionCambio: number;
  mensajes: MensajeWire[];
}

interface ReglaFallo {
  readonly fallo: FalloConversaciones;
  restantes: number;
}

interface EstadoConversacionesMock {
  sujetoId: string;
  revision: number;
  /** Revisión mínima con catch-up posible; por debajo, `stream_resync_required`. */
  ventanaMinima: number;
  conversaciones: ConversacionInterna[];
  fallos: Map<OperacionConversaciones, ReglaFallo>;
  solicitudes: SolicitudConversaciones[];
  contadorInstantes: number;
}

function marcaConversaciones(minutos: number): string {
  return new Date(INSTANTE_BASE_CONVERSACIONES + minutos * 60_000).toISOString();
}

function mensajeDemo(
  conversacionId: string,
  secuencia: number,
  autor: 'cliente' | 'ai27',
  cuerpo: string,
  actorInterno: string,
): MensajeWire {
  const esCliente = autor === 'cliente';
  return {
    id: `MSG-${conversacionId}-${secuencia}`,
    conversacion_id: conversacionId,
    secuencia,
    client_message_id: `cmid-${conversacionId}-${secuencia}`,
    audiencia_autor: esCliente ? 'Cliente' : 'Interno',
    alias_mostrado: esCliente ? 'Cliente' : 'AI27 Operations',
    actor_real: esCliente ? null : actorInterno,
    rol_al_enviar: esCliente ? null : Rol.Ejecutivo,
    cuerpo,
    creado_en: marcaConversaciones(secuencia),
  };
}

function reclamoDemo(conversacionId: string, responsableId: string, version: number): ReclamoWire {
  return {
    id: `REC-${conversacionId}-${version}`,
    conversacion_id: conversacionId,
    responsable_id: responsableId,
    version,
    abierto_en: marcaConversaciones(version),
    cerrado_en: null,
  };
}

function crearConversacionInterna(
  base: {
    id: string;
    clienteId: string;
    version: number;
    responsableId?: string;
    atendida?: boolean;
    estado?: ConversacionWire['estado'];
    revisionCambio: number;
  },
  mensajes: MensajeWire[],
): ConversacionInterna {
  const ultima = mensajes.at(-1)?.secuencia ?? 0;
  const soloLectura = base.estado === 'solo_lectura';
  return {
    revisionCambio: base.revisionCambio,
    mensajes,
    conversacion: {
      id: base.id,
      viaje_id: `VJ-${base.id.replace('CNV-', '100')}`,
      cliente_id: base.clienteId,
      bandeja_id: 'BDJ-1',
      estado: base.estado ?? 'abierta',
      escritura_hasta: soloLectura ? marcaConversaciones(-60) : marcaConversaciones(60 * 24 * 3),
      ultima_secuencia: ultima,
      version_reclamo: base.version,
      reclamo_activo: base.responsableId
        ? reclamoDemo(base.id, base.responsableId, base.version)
        : null,
      atendida_en: base.atendida ? marcaConversaciones(30) : null,
      abierta_en: marcaConversaciones(-base.revisionCambio * 10),
    },
  };
}

function crearEstadoConversaciones(sujetoId: string): EstadoConversacionesMock {
  const c = CONVERSACIONES_DEMO_IDS;
  const o = OTRO_RESPONSABLE_DEMO;
  return {
    sujetoId,
    revision: 6,
    ventanaMinima: 0,
    fallos: new Map(),
    solicitudes: [],
    contadorInstantes: 200,
    conversaciones: [
      // En el pool, sin atender, con historial anterior a cualquier alta.
      crearConversacionInterna(
        { id: c.pool, clienteId: 'CLI-1001', version: 2, revisionCambio: 1 },
        [
          mensajeDemo(c.pool, 3, 'cliente', 'Buenos días, ¿ya salió la unidad?', o),
          mensajeDemo(c.pool, 7, 'ai27', 'Estamos confirmando con el monitorista.', o),
          mensajeDemo(c.pool, 12, 'cliente', 'Quedo atento.', o),
        ],
      ),
      // Reclamada por el usuario de la sesión, sin atender.
      crearConversacionInterna(
        {
          id: c.mia,
          clienteId: 'CLI-1002',
          version: 3,
          responsableId: sujetoId,
          revisionCambio: 2,
        },
        [
          mensajeDemo(c.mia, 4, 'cliente', '¿Cuál es el ETA de la unidad?', o),
          mensajeDemo(c.mia, 9, 'ai27', 'El ETA estimado es 18:30.', sujetoId),
          mensajeDemo(c.mia, 15, 'cliente', 'Gracias, ¿pueden confirmar la parada?', o),
        ],
      ),
      // Reclamada por otra persona.
      crearConversacionInterna(
        { id: c.deOtro, clienteId: 'CLI-1003', version: 5, responsableId: o, revisionCambio: 3 },
        [
          mensajeDemo(c.deOtro, 2, 'cliente', 'Necesito cambiar el destino.', o),
          mensajeDemo(c.deOtro, 6, 'ai27', 'Lo estamos revisando.', o),
        ],
      ),
      // Reclamada por el usuario y ya marcada atendida.
      crearConversacionInterna(
        {
          id: c.atendida,
          clienteId: 'CLI-1001',
          version: 1,
          responsableId: sujetoId,
          atendida: true,
          revisionCambio: 4,
        },
        [
          mensajeDemo(c.atendida, 5, 'cliente', 'Recibimos la unidad, gracias.', o),
          mensajeDemo(c.atendida, 8, 'ai27', 'A sus órdenes.', sujetoId),
        ],
      ),
      // Ventana de escritura vencida y cliente que no resuelve nombre.
      crearConversacionInterna(
        {
          id: c.soloLectura,
          clienteId: CLIENTE_SIN_NOMBRE_DEMO,
          version: 4,
          estado: 'solo_lectura',
          revisionCambio: 5,
        },
        [
          mensajeDemo(c.soloLectura, 1, 'cliente', 'Cierre del servicio.', o),
          mensajeDemo(c.soloLectura, 10, 'ai27', 'Servicio concluido.', o),
        ],
      ),
      // En el pool, con historial más largo que una página de mensajes. Cae en la
      // segunda página de la bandeja (cursor).
      crearConversacionInterna(
        { id: c.historialLargo, clienteId: 'CLI-1002', version: 0, revisionCambio: 6 },
        [
          mensajeDemo(c.historialLargo, 2, 'cliente', 'Mensaje 2 del historial.', o),
          mensajeDemo(c.historialLargo, 5, 'ai27', 'Mensaje 5 del historial.', o),
          mensajeDemo(c.historialLargo, 9, 'cliente', 'Mensaje 9 del historial.', o),
          mensajeDemo(c.historialLargo, 14, 'ai27', 'Mensaje 14 del historial.', o),
          mensajeDemo(c.historialLargo, 20, 'cliente', 'Mensaje 20 del historial.', o),
          mensajeDemo(c.historialLargo, 27, 'ai27', 'Mensaje 27 del historial.', o),
          mensajeDemo(c.historialLargo, 35, 'cliente', 'Mensaje 35 del historial.', o),
          mensajeDemo(c.historialLargo, 44, 'ai27', 'Mensaje 44 del historial.', o),
        ],
      ),
    ],
  };
}

let estadoConversaciones = crearEstadoConversaciones(SUJETO_CONVERSACIONES_DEMO);

/** Reinicia fixtures, fallos forzados y solicitudes registradas. */
export function reiniciarConversacionesMock(opciones: { sujetoId?: string } = {}): void {
  estadoConversaciones = crearEstadoConversaciones(opciones.sujetoId ?? SUJETO_CONVERSACIONES_DEMO);
}

/** Sujeto cuya sesión simula el mock (el que "reclama" y "responde"). */
export function sujetoConversacionesMock(): string {
  return estadoConversaciones.sujetoId;
}

/** Solicitudes recibidas por el `bff` simulado, en orden (cuerpo y query ya interpretados). */
export function solicitudesConversacionesMock(): readonly SolicitudConversaciones[] {
  return estadoConversaciones.solicitudes;
}

export function registrarSolicitudConversaciones(solicitud: SolicitudConversaciones): void {
  estadoConversaciones.solicitudes.push(solicitud);
}

/**
 * Fuerza el fallo de una operación. `veces` limita cuántas peticiones lo sufren
 * (por omisión una; `Infinity` lo deja fijo hasta `limpiarFallosConversaciones`).
 */
export function forzarFalloConversaciones(
  operacion: OperacionConversaciones,
  fallo: FalloConversaciones,
  veces = 1,
): void {
  estadoConversaciones.fallos.set(operacion, { fallo, restantes: veces });
}

export function limpiarFallosConversaciones(): void {
  estadoConversaciones.fallos.clear();
}

/** Consume un uso del fallo forzado de la operación, si lo hay. */
export function tomarFalloConversaciones(
  operacion: OperacionConversaciones,
): FalloConversaciones | undefined {
  const regla = estadoConversaciones.fallos.get(operacion);
  if (!regla) return undefined;
  regla.restantes -= 1;
  if (regla.restantes <= 0) estadoConversaciones.fallos.delete(operacion);
  return regla.fallo;
}

function buscarConversacion(id: string): ConversacionInterna | undefined {
  return estadoConversaciones.conversaciones.find((item) => item.conversacion.id === id);
}

/** Avanza la revisión de la colección y marca la conversación como cambiada en ella. */
function registrarCambio(item: ConversacionInterna): void {
  estadoConversaciones.revision += 1;
  item.revisionCambio = estadoConversaciones.revision;
}

function copiar<T>(valor: T): T {
  return structuredClone(valor);
}

function siguienteInstante(): string {
  estadoConversaciones.contadorInstantes += 1;
  return marcaConversaciones(estadoConversaciones.contadorInstantes);
}

const rechazo = (
  status: 400 | 403 | 404 | 409,
  codigo: string,
): { ok: false; status: 400 | 403 | 404 | 409; codigo: string } => ({ ok: false, status, codigo });

/**
 * Bootstrap (`desdeRevision` nulo): página por `cursor`. Catch-up: solo las
 * conversaciones cambiadas después de `desdeRevision`; si la revisión quedó fuera
 * de la ventana retenida, `stream_resync_required`.
 */
export function listarTrabajoBandejaMock(
  desdeRevision: number | null,
  cursor: string | null,
): ResultadoConversaciones<TrabajoBandejaWire> {
  const { conversaciones, revision, ventanaMinima } = estadoConversaciones;
  if (desdeRevision !== null) {
    if (desdeRevision < ventanaMinima) return rechazo(409, 'stream_resync_required');
    const cambiadas = conversaciones
      .filter((item) => item.revisionCambio > desdeRevision)
      .map((item) => copiar(item.conversacion));
    return { ok: true, valor: { items: cambiadas, revision, cursor_siguiente: null } };
  }
  const inicio = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
  const pagina = conversaciones.slice(inicio, inicio + TAMANO_PAGINA_BANDEJA);
  const fin = inicio + pagina.length;
  return {
    ok: true,
    valor: {
      items: pagina.map((item) => copiar(item.conversacion)),
      revision,
      cursor_siguiente: fin < conversaciones.length ? String(fin) : null,
    },
  };
}

export function obtenerConversacionMock(id: string): ConversacionWire | null {
  const item = buscarConversacion(id);
  return item ? copiar(item.conversacion) : null;
}

/**
 * Sin parámetros: la página más reciente. `antesDe`: la página inmediata anterior a
 * esa secuencia. `despuesDe`: catch-up en orden ascendente. Siempre ascendente.
 */
export function listarMensajesMock(
  id: string,
  params: { antesDe?: number; despuesDe?: number; limite?: number },
): PaginaMensajesWire | null {
  const item = buscarConversacion(id);
  if (!item) return null;
  const limite = params.limite ?? LIMITE_MENSAJES_POR_DEFECTO;
  if (params.despuesDe !== undefined) {
    const nuevos = item.mensajes.filter((m) => m.secuencia > params.despuesDe!);
    return { items: copiar(nuevos.slice(0, limite)), hay_mas: nuevos.length > limite };
  }
  const candidatos =
    params.antesDe !== undefined
      ? item.mensajes.filter((m) => m.secuencia < params.antesDe!)
      : item.mensajes;
  const pagina = candidatos.slice(-limite);
  return { items: copiar(pagina), hay_mas: candidatos.length > pagina.length };
}

export function enviarMensajeMock(
  id: string,
  entrada: Partial<EnviarMensajeInternaEntradaWire> & Record<string, unknown>,
): ResultadoConversaciones<{ mensaje: MensajeWire; reintento: boolean }> {
  const item = buscarConversacion(id);
  if (!item) return rechazo(404, 'no_encontrado');
  if ('motivo_override' in entrada) return rechazo(400, 'solicitud_invalida');
  if (typeof entrada.cuerpo !== 'string' || !entrada.cuerpo.trim() || !entrada.client_message_id) {
    return rechazo(400, 'solicitud_invalida');
  }
  // Reintento idempotente: mismo `client_message_id`, mismo mensaje (200).
  const previo = item.mensajes.find((m) => m.client_message_id === entrada.client_message_id);
  if (previo) return { ok: true, valor: { mensaje: copiar(previo), reintento: true } };

  const c = item.conversacion;
  if (c.estado !== 'abierta') return rechazo(409, 'conversacion_solo_lectura');
  if (c.reclamo_activo?.responsable_id !== estadoConversaciones.sujetoId) {
    return rechazo(403, 'prohibido');
  }
  if (entrada.version_reclamo_esperada !== c.version_reclamo) {
    return rechazo(409, 'conflicto_version_reclamo');
  }
  const secuencia = c.ultima_secuencia + 1;
  const mensaje: MensajeWire = {
    id: `MSG-${id}-${secuencia}`,
    conversacion_id: id,
    secuencia,
    client_message_id: entrada.client_message_id,
    audiencia_autor: 'Interno',
    alias_mostrado: 'AI27 Operations',
    actor_real: estadoConversaciones.sujetoId,
    rol_al_enviar: Rol.Ejecutivo,
    cuerpo: entrada.cuerpo,
    creado_en: siguienteInstante(),
  };
  item.mensajes.push(mensaje);
  // Responder NO marca atendida (DEC-117): `atendida_en` queda como estaba.
  c.ultima_secuencia = secuencia;
  return { ok: true, valor: { mensaje: copiar(mensaje), reintento: false } };
}

export function reclamarConversacionMock(
  id: string,
  versionEsperada: unknown,
): ResultadoConversaciones<ReclamoWire> {
  const item = buscarConversacion(id);
  if (!item) return rechazo(404, 'no_encontrado');
  const c = item.conversacion;
  if (c.estado !== 'abierta') return rechazo(409, 'conversacion_solo_lectura');
  if (c.reclamo_activo || versionEsperada !== c.version_reclamo) {
    return rechazo(409, 'conflicto_version_reclamo');
  }
  c.version_reclamo += 1;
  c.reclamo_activo = reclamoDemo(id, estadoConversaciones.sujetoId, c.version_reclamo);
  registrarCambio(item);
  return { ok: true, valor: copiar(c.reclamo_activo) };
}

export function liberarReclamoMock(
  id: string,
  reclamoId: string,
  versionEsperada: unknown,
): ResultadoConversaciones<null> {
  const item = buscarConversacion(id);
  if (!item) return rechazo(404, 'no_encontrado');
  const c = item.conversacion;
  if (!c.reclamo_activo) return rechazo(409, 'conflicto_version_reclamo');
  if (c.reclamo_activo.responsable_id !== estadoConversaciones.sujetoId) {
    return rechazo(403, 'prohibido');
  }
  if (c.reclamo_activo.id !== reclamoId || versionEsperada !== c.version_reclamo) {
    return rechazo(409, 'conflicto_version_reclamo');
  }
  c.version_reclamo += 1;
  c.reclamo_activo = null;
  registrarCambio(item);
  return { ok: true, valor: null };
}

export function marcarAtendidaMock(
  id: string,
  versionEsperada: unknown,
): ResultadoConversaciones<null> {
  const item = buscarConversacion(id);
  if (!item) return rechazo(404, 'no_encontrado');
  const c = item.conversacion;
  if (!c.reclamo_activo) return rechazo(409, 'conflicto_version_reclamo');
  if (c.reclamo_activo.responsable_id !== estadoConversaciones.sujetoId) {
    return rechazo(403, 'prohibido');
  }
  if (versionEsperada !== c.version_reclamo) return rechazo(409, 'conflicto_version_reclamo');
  c.atendida_en = siguienteInstante();
  registrarCambio(item);
  return { ok: true, valor: null };
}

export function registrarReciboLeidoMock(id: string): boolean {
  return buscarConversacion(id) !== undefined;
}

/* --- Acciones de otras personas (simulación de concurrencia en pruebas) --- */

/** Otra persona reclama la conversación: sube la versión y cambia el responsable. */
export function simularReclamoDeOtraPersonaMock(id: string): void {
  const item = buscarConversacion(id);
  if (!item) return;
  const c = item.conversacion;
  c.version_reclamo += 1;
  c.reclamo_activo = reclamoDemo(id, OTRO_RESPONSABLE_DEMO, c.version_reclamo);
  registrarCambio(item);
}

/** Otra persona devuelve la conversación al pool. */
export function simularLiberacionDeOtraPersonaMock(id: string): void {
  const item = buscarConversacion(id);
  if (!item) return;
  const c = item.conversacion;
  c.version_reclamo += 1;
  c.reclamo_activo = null;
  registrarCambio(item);
}

/** El cliente escribe: agrega el mensaje y deja `atendida_en` vacío (DEC-122). */
export function simularMensajeDeClienteMock(id: string, cuerpo: string): MensajeWire | null {
  const item = buscarConversacion(id);
  if (!item) return null;
  const c = item.conversacion;
  const mensaje = mensajeDemo(id, c.ultima_secuencia + 1, 'cliente', cuerpo, OTRO_RESPONSABLE_DEMO);
  item.mensajes.push(mensaje);
  c.ultima_secuencia = mensaje.secuencia;
  c.atendida_en = null;
  registrarCambio(item);
  return copiar(mensaje);
}

/**
 * Descarta la ventana de cambios retenida: cualquier catch-up desde una revisión
 * anterior responde `stream_resync_required`; el bootstrap sigue disponible.
 */
export function compactarVentanaConversacionesMock(): void {
  estadoConversaciones.revision += 1;
  estadoConversaciones.ventanaMinima = estadoConversaciones.revision;
}

/** Pasa la conversación a `solo_lectura`: venció la ventana de escritura (DEC-030, DEC-041). */
export function simularVencimientoDeVentanaMock(id: string): void {
  const item = buscarConversacion(id);
  if (!item) return;
  item.conversacion.estado = 'solo_lectura';
  item.conversacion.escritura_hasta = marcaConversaciones(-1);
  registrarCambio(item);
}

/**
 * Cambia el sujeto que "es" la sesión para el mock, conservando el estado. Sirve
 * para simular a una segunda persona del pool actuando sobre la misma conversación.
 */
export function cambiarSujetoConversacionesMock(sujetoId: string): void {
  estadoConversaciones.sujetoId = sujetoId;
}
