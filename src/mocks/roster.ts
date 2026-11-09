/*
 * Handlers MSW del roster, vehículos, custodios y escolta del viaje (tracer.39).
 *
 * Reproducen la forma del `bff` y las reglas que aplica el servidor, para que las
 * pruebas y el modo mock no mientan:
 * - Facultades por el rol del JWT (DEC-142 #3 y #6): el roster y la lectura de
 *   vehículos y custodios, `jefe_operativo` y `administrador`; escribir vehículos y
 *   custodios, solo `administrador`. Otro rol interno responde 403.
 * - Alta y edición de unidad (DEC-142 #4, #5, #9, #10; ADR 31): `tipo` derivado del
 *   vehículo, 400 por validación, 409 `vehiculo_en_otra_unidad`,
 *   `custodio_en_otra_unidad` y `unidad_con_reserva_vigente`.
 * - `obtenerAsignacion`: cualquier rol interno; `unidades` vacío sin asignación.
 *
 * El estado vive en memoria y se reinicia al recargar (o con `reiniciarRosterMock`).
 */

import { http, HttpResponse } from 'msw';

import { API_PREFIX } from '@/lib/constants';
import { Rol } from '@/lib/contracts';
import type { Custodio, Vehiculo } from '@/lib/contracts/catalogos';
import { decodificarClaims, rolValido } from '@/lib/contracts/jwt';
import type { Unidad } from '@/lib/contracts/unidades';
import { esTerminal, type EstadoViaje } from '@/lib/contracts/viajeDetalle';

import { obtenerDetalleViajeMock } from './data';

const path = (segmento: string) => `${API_PREFIX}${segmento}`;

/** Tamaño de página del roster simulado; el real lo decide `operacion`. */
export const TAMANO_PAGINA_ROSTER = 5;

const ROLES_ROSTER: readonly Rol[] = [Rol.JefeOperativo, Rol.Administrador];
const ROLES_ESCRITURA_CATALOGOS: readonly Rol[] = [Rol.Administrador];

interface UnidadMock {
  id: string;
  vehiculo_id: string;
  custodios_ids: string[];
  activa: boolean;
}

function semillaVehiculos(): Vehiculo[] {
  return [
    {
      id: 'VEH-2001',
      version: 1,
      tipo: 'coche',
      economico: 'P-101',
      placas: 'ABC-1234',
      estado: 'activa',
    },
    {
      id: 'VEH-2002',
      version: 1,
      tipo: 'moto',
      economico: 'M-07',
      placas: 'XYZ-987',
      estado: 'activa',
    },
    {
      id: 'VEH-2003',
      version: 1,
      tipo: 'coche',
      economico: 'P-102',
      placas: 'DEF-5678',
      estado: 'activa',
    },
    {
      id: 'VEH-2004',
      version: 1,
      tipo: 'coche',
      economico: 'P-090',
      placas: 'GHI-0001',
      estado: 'inactiva',
    },
  ];
}

function semillaCustodios(): Custodio[] {
  return [
    {
      id: 'CUS-3001',
      version: 1,
      nombre: 'Juan Pérez',
      telefono: '+52 55 1000 0001',
      estado: 'activo',
    },
    { id: 'CUS-3002', version: 1, nombre: 'Ana López', estado: 'activo' },
    { id: 'CUS-3003', version: 1, nombre: 'Luis Ramírez', estado: 'activo' },
    {
      id: 'CUS-3004',
      version: 1,
      nombre: 'María Torres',
      telefono: '+52 55 1000 0004',
      estado: 'activo',
    },
    { id: 'CUS-3005', version: 1, nombre: 'Pedro Gómez', estado: 'activo' },
    { id: 'CUS-3006', version: 1, nombre: 'Rosa Díaz', estado: 'inactivo' },
  ];
}

function semillaUnidades(): UnidadMock[] {
  return [
    {
      id: 'UN-1001',
      vehiculo_id: 'VEH-2001',
      custodios_ids: ['CUS-3001', 'CUS-3002'],
      activa: true,
    },
    { id: 'UN-1002', vehiculo_id: 'VEH-2002', custodios_ids: ['CUS-3003'], activa: false },
  ];
}

/** Escoltas reservadas por viaje. VJ-1001 va en tránsito con UN-1001. */
function semillaReservas(): Record<string, string[]> {
  return { 'VJ-1001': ['UN-1001'] };
}

let vehiculos = semillaVehiculos();
let custodios = semillaCustodios();
let unidades = semillaUnidades();
let reservas = semillaReservas();
let secuencia = 1;

/** Devuelve el estado a la semilla. Para pruebas que necesitan aislamiento. */
export function reiniciarRosterMock(): void {
  vehiculos = semillaVehiculos();
  custodios = semillaCustodios();
  unidades = semillaUnidades();
  reservas = semillaReservas();
  secuencia = 1;
}

function error(status: number, codigo: string, mensaje: string) {
  return HttpResponse.json({ codigo, mensaje }, { status });
}

/** Rol del JWT del mock; null si el token no es decodificable. */
function rolDe(request: Request): Rol | null {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const claims = decodificarClaims(token);
  return claims ? rolValido(claims) : null;
}

/** 401 sin token válido, 403 si el rol no tiene la facultad, null si pasa. */
function exigirRol(request: Request, permitidos: readonly Rol[], operacion: string) {
  const rol = rolDe(request);
  if (rol === null) return error(401, 'no_autorizado', 'token ausente o inválido');
  if (!permitidos.includes(rol)) {
    return error(403, 'prohibido', `el rol ${rol} no puede invocar ${operacion}`);
  }
  return null;
}

function legible(unidad: UnidadMock): Unidad {
  const vehiculo = vehiculos.find((v) => v.id === unidad.vehiculo_id);
  const tipo = vehiculo?.tipo === 'moto' ? 'moto' : 'patrulla';
  return {
    ...unidad,
    custodios_ids: [...unidad.custodios_ids],
    tipo,
    ...(vehiculo && {
      vehiculo: {
        ...(vehiculo.economico && { economico: vehiculo.economico }),
        ...(vehiculo.placas && { placas: vehiculo.placas }),
      },
    }),
    custodios: unidad.custodios_ids.flatMap((id) => {
      const custodio = custodios.find((c) => c.id === id);
      return custodio ? [{ id, nombre: custodio.nombre }] : [];
    }),
  };
}

/** Unidad del roster por id, para la asignación del viaje. */
export function unidadDelRosterMock(id: string): Unidad | null {
  const unidad = unidades.find((u) => u.id === id);
  return unidad ? legible(unidad) : null;
}

/** Registra la escolta reservada al asignar el viaje. */
export function reservarEscoltaMock(viajeId: string, unidadesIds: string[]): void {
  reservas[viajeId] = [...unidadesIds];
}

function tieneReservaVigente(unidadId: string): boolean {
  return Object.entries(reservas).some(([viajeId, ids]) => {
    if (!ids.includes(unidadId)) return false;
    const estado = obtenerDetalleViajeMock(viajeId)?.viaje.estado;
    return estado !== undefined && !esTerminal(estado as EstadoViaje);
  });
}

async function leerCuerpo(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const cuerpo: unknown = await request.json();
    return cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo)
      ? (cuerpo as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Campos fuera del schema: el `bff` responde 400 (`additionalProperties: false`). */
function camposDesconocidos(cuerpo: Record<string, unknown>, permitidos: readonly string[]) {
  return Object.keys(cuerpo).filter((campo) => !permitidos.includes(campo));
}

/**
 * Valida vehículo y custodios contra el catálogo y la regla de tipo (ADR 31).
 * Devuelve el mensaje del 400 o null.
 */
function validarArmado(vehiculoId: string, custodiosIds: unknown): string | null {
  const vehiculo = vehiculos.find((v) => v.id === vehiculoId);
  if (!vehiculo || vehiculo.estado !== 'activa') return 'el vehículo no existe o está inactivo';
  if (
    !Array.isArray(custodiosIds) ||
    custodiosIds.length === 0 ||
    custodiosIds.length > 2 ||
    custodiosIds.some((id) => typeof id !== 'string')
  ) {
    return 'custodios_ids debe traer uno o dos identificadores';
  }
  if (new Set(custodiosIds).size !== custodiosIds.length) return 'custodios repetidos';
  if (custodiosIds.some((id) => custodios.find((c) => c.id === id)?.estado !== 'activo')) {
    return 'algún custodio no existe o está inactivo';
  }
  if (vehiculo.tipo === 'moto' && custodiosIds.length !== 1) {
    return 'una moto lleva exactamente un custodio';
  }
  return null;
}

/** Exclusividad entre unidades activas (DEC-142 #4). */
function choqueDeExclusividad(propia: string | null, vehiculoId: string, custodiosIds: string[]) {
  const otrasActivas = unidades.filter((u) => u.activa && u.id !== propia);
  if (otrasActivas.some((u) => u.vehiculo_id === vehiculoId)) {
    return error(409, 'vehiculo_en_otra_unidad', 'el vehículo ya está en otra unidad activa');
  }
  if (otrasActivas.some((u) => u.custodios_ids.some((id) => custodiosIds.includes(id)))) {
    return error(409, 'custodio_en_otra_unidad', 'un custodio ya está en otra unidad activa');
  }
  return null;
}

function paginar<T>(items: readonly T[], request: Request) {
  const cursor = new URL(request.url).searchParams.get('cursor');
  const inicio = cursor ? Number(cursor) : 0;
  const fin = inicio + TAMANO_PAGINA_ROSTER;
  return {
    items: items.slice(inicio, fin),
    cursor_siguiente: fin < items.length ? String(fin) : null,
  };
}

const ESTADOS_VEHICULO = ['activa', 'inactiva'];
const TIPOS_VEHICULO = ['coche', 'moto'];
const ESTADOS_CUSTODIO = ['activo', 'inactivo'];

function validarVehiculo(cuerpo: Record<string, unknown>, alta: boolean): string | null {
  const extra = camposDesconocidos(cuerpo, ['tipo', 'economico', 'placas', 'estado']);
  if (extra.length > 0) return `campos no permitidos: ${extra.join(', ')}`;
  if ((alta || 'tipo' in cuerpo) && !TIPOS_VEHICULO.includes(cuerpo.tipo as string)) {
    return 'tipo debe ser coche o moto';
  }
  if ((alta || 'estado' in cuerpo) && !ESTADOS_VEHICULO.includes(cuerpo.estado as string)) {
    return 'estado debe ser activa o inactiva';
  }
  for (const campo of ['economico', 'placas']) {
    if (campo in cuerpo && typeof cuerpo[campo] !== 'string') return `${campo} debe ser texto`;
  }
  return null;
}

function validarCustodio(cuerpo: Record<string, unknown>, alta: boolean): string | null {
  const extra = camposDesconocidos(cuerpo, ['nombre', 'telefono', 'estado', 'usuario_id']);
  if (extra.length > 0) return `campos no permitidos: ${extra.join(', ')}`;
  if ((alta || 'nombre' in cuerpo) && typeof cuerpo.nombre !== 'string') {
    return 'nombre es obligatorio';
  }
  if ((alta || 'estado' in cuerpo) && !ESTADOS_CUSTODIO.includes(cuerpo.estado as string)) {
    return 'estado debe ser activo o inactivo';
  }
  if ('telefono' in cuerpo && typeof cuerpo.telefono !== 'string') return 'telefono debe ser texto';
  return null;
}

export const handlersRoster = [
  // --- Roster de unidades (E8-T21) ---
  http.get(path('/unidades'), ({ request }) => {
    const rechazo = exigirRol(request, ROLES_ROSTER, 'listarUnidades');
    if (rechazo) return rechazo;
    return HttpResponse.json(paginar(unidades.map(legible), request));
  }),

  http.post(path('/unidades'), async ({ request }) => {
    const rechazo = exigirRol(request, ROLES_ROSTER, 'crearUnidad');
    if (rechazo) return rechazo;
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return error(400, 'validacion', 'cuerpo inválido');
    const extra = camposDesconocidos(cuerpo, ['vehiculo_id', 'custodios_ids', 'activa']);
    if (extra.length > 0)
      return error(400, 'validacion', `campos no permitidos: ${extra.join(', ')}`);
    if ('activa' in cuerpo && typeof cuerpo.activa !== 'boolean') {
      return error(400, 'validacion', 'activa debe ser booleano');
    }
    const vehiculoId = String(cuerpo.vehiculo_id ?? '');
    const invalido = validarArmado(vehiculoId, cuerpo.custodios_ids);
    if (invalido) return error(400, 'validacion', invalido);
    const custodiosIds = cuerpo.custodios_ids as string[];
    // DEC-142 #10: nace activa si el alta no indica `activa`.
    const activa = cuerpo.activa !== false;
    if (activa) {
      const choque = choqueDeExclusividad(null, vehiculoId, custodiosIds);
      if (choque) return choque;
    }
    const unidad: UnidadMock = {
      id: `UN-N${secuencia++}`,
      vehiculo_id: vehiculoId,
      custodios_ids: [...custodiosIds],
      activa,
    };
    unidades = [...unidades, unidad];
    return HttpResponse.json(legible(unidad), { status: 201 });
  }),

  http.get(path('/unidades/:id'), ({ params, request }) => {
    const rechazo = exigirRol(request, ROLES_ROSTER, 'obtenerUnidad');
    if (rechazo) return rechazo;
    const unidad = unidades.find((u) => u.id === params.id);
    return unidad ? HttpResponse.json(legible(unidad)) : error(404, 'no_encontrado', 'unidad');
  }),

  http.patch(path('/unidades/:id'), async ({ params, request }) => {
    const rechazo = exigirRol(request, ROLES_ROSTER, 'modificarUnidad');
    if (rechazo) return rechazo;
    const actual = unidades.find((u) => u.id === params.id);
    if (!actual) return error(404, 'no_encontrado', 'unidad');
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return error(400, 'validacion', 'cuerpo inválido');
    const extra = camposDesconocidos(cuerpo, ['vehiculo_id', 'custodios_ids', 'activa']);
    if (extra.length > 0)
      return error(400, 'validacion', `campos no permitidos: ${extra.join(', ')}`);
    // DEC-142 #5 y #9: con reserva vigente no se edita, ni siquiera sin cambio efectivo.
    if (tieneReservaVigente(actual.id)) {
      return error(
        409,
        'unidad_con_reserva_vigente',
        'la unidad tiene una reserva en un viaje no terminal',
      );
    }
    const siguiente: UnidadMock = {
      ...actual,
      ...(typeof cuerpo.vehiculo_id === 'string' && { vehiculo_id: cuerpo.vehiculo_id }),
      ...(Array.isArray(cuerpo.custodios_ids) && {
        custodios_ids: cuerpo.custodios_ids as string[],
      }),
      ...(typeof cuerpo.activa === 'boolean' && { activa: cuerpo.activa }),
    };
    if ('vehiculo_id' in cuerpo || 'custodios_ids' in cuerpo) {
      const invalido = validarArmado(siguiente.vehiculo_id, siguiente.custodios_ids);
      if (invalido) return error(400, 'validacion', invalido);
    }
    if (siguiente.activa) {
      const choque = choqueDeExclusividad(
        actual.id,
        siguiente.vehiculo_id,
        siguiente.custodios_ids,
      );
      if (choque) return choque;
    }
    unidades = unidades.map((u) => (u.id === actual.id ? siguiente : u));
    return HttpResponse.json(legible(siguiente));
  }),

  // --- Escolta vigente del viaje (E8-T12): cualquier rol interno ---
  http.get(path('/viajes/:id/asignacion'), ({ params, request }) => {
    const rol = rolDe(request);
    if (rol === null) return error(401, 'no_autorizado', 'token ausente o inválido');
    const id = params.id as string;
    if (rol === Rol.Cliente || !obtenerDetalleViajeMock(id)) {
      return error(404, 'no_encontrado', 'viaje');
    }
    const ids = [...(reservas[id] ?? [])].sort();
    return HttpResponse.json({
      viaje_id: id,
      unidades: ids.flatMap((uid) => {
        const unidad = unidadDelRosterMock(uid);
        return unidad ? [unidad] : [];
      }),
    });
  }),

  // --- Vehículos (adelanto de E8-T16) ---
  http.get(path('/vehiculos'), ({ request }) => {
    const rechazo = exigirRol(request, ROLES_ROSTER, 'listarVehiculos');
    if (rechazo) return rechazo;
    return HttpResponse.json(paginar(vehiculos, request));
  }),

  http.post(path('/vehiculos'), async ({ request }) => {
    const rechazo = exigirRol(request, ROLES_ESCRITURA_CATALOGOS, 'crearVehiculo');
    if (rechazo) return rechazo;
    const cuerpo = await leerCuerpo(request);
    const invalido = cuerpo ? validarVehiculo(cuerpo, true) : 'cuerpo inválido';
    if (invalido || !cuerpo) return error(400, 'validacion', invalido ?? 'cuerpo inválido');
    const vehiculo = { ...cuerpo, id: `VEH-N${secuencia++}`, version: 1 } as Vehiculo;
    vehiculos = [...vehiculos, vehiculo];
    return HttpResponse.json(vehiculo, { status: 201 });
  }),

  http.patch(path('/vehiculos/:id'), async ({ params, request }) => {
    const rechazo = exigirRol(request, ROLES_ESCRITURA_CATALOGOS, 'actualizarVehiculo');
    if (rechazo) return rechazo;
    const actual = vehiculos.find((v) => v.id === params.id);
    if (!actual) return error(404, 'no_encontrado', 'vehículo');
    const cuerpo = await leerCuerpo(request);
    const invalido = cuerpo ? validarVehiculo(cuerpo, false) : 'cuerpo inválido';
    if (invalido || !cuerpo) return error(400, 'validacion', invalido ?? 'cuerpo inválido');
    const siguiente = { ...actual, ...cuerpo, version: (actual.version ?? 1) + 1 } as Vehiculo;
    vehiculos = vehiculos.map((v) => (v.id === actual.id ? siguiente : v));
    return HttpResponse.json(siguiente);
  }),

  // --- Custodios (adelanto de E8-T16) ---
  http.get(path('/custodios'), ({ request }) => {
    const rechazo = exigirRol(request, ROLES_ROSTER, 'listarCustodios');
    if (rechazo) return rechazo;
    return HttpResponse.json(paginar(custodios, request));
  }),

  http.post(path('/custodios'), async ({ request }) => {
    const rechazo = exigirRol(request, ROLES_ESCRITURA_CATALOGOS, 'crearCustodio');
    if (rechazo) return rechazo;
    const cuerpo = await leerCuerpo(request);
    const invalido = cuerpo ? validarCustodio(cuerpo, true) : 'cuerpo inválido';
    if (invalido || !cuerpo) return error(400, 'validacion', invalido ?? 'cuerpo inválido');
    const custodio = { ...cuerpo, id: `CUS-N${secuencia++}`, version: 1 } as Custodio;
    custodios = [...custodios, custodio];
    return HttpResponse.json(custodio, { status: 201 });
  }),

  http.patch(path('/custodios/:id'), async ({ params, request }) => {
    const rechazo = exigirRol(request, ROLES_ESCRITURA_CATALOGOS, 'actualizarCustodio');
    if (rechazo) return rechazo;
    const actual = custodios.find((c) => c.id === params.id);
    if (!actual) return error(404, 'no_encontrado', 'custodio');
    const cuerpo = await leerCuerpo(request);
    const invalido = cuerpo ? validarCustodio(cuerpo, false) : 'cuerpo inválido';
    if (invalido || !cuerpo) return error(400, 'validacion', invalido ?? 'cuerpo inválido');
    const siguiente = { ...actual, ...cuerpo, version: (actual.version ?? 1) + 1 } as Custodio;
    custodios = custodios.map((c) => (c.id === actual.id ? siguiente : c));
    return HttpResponse.json(siguiente);
  }),
];
