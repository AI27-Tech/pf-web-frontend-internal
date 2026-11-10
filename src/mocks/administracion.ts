/*
 * Mocks de la administración (E8-T19): sujetos, roles, alcance, organizaciones y
 * revocación, sobre los contratos de `bff` (tracer.40).
 *
 * Simulan las reglas que el `bff` aplica y los `codigo` de máquina que documenta
 * el contrato. No son la autoridad: el servidor real decide. El estado vive en
 * memoria y `reiniciarAdministracionMock()` lo devuelve a la semilla (pruebas).
 */

import { http, HttpResponse } from 'msw';

import { API_PREFIX } from '@/lib/constants';
import { Rol, ROLES } from '@/lib/contracts';
import { decodificarClaims, rolValido } from '@/lib/contracts/jwt';
import type {
  AlcanceSujeto,
  AltaSujetoEntrada,
  OrganizacionCambios,
  OrganizacionEntrada,
  OrganizacionWire,
  UsuarioAdmin,
} from '@/lib/contracts/administracion';

const path = (segmento: string) => `${API_PREFIX}${segmento}`;

/** Tamaño de página de los listados simulados. */
const TAMANO_PAGINA = 10;

interface SujetoMock {
  id: string;
  nombre?: string;
  identificador_usuario?: string;
  rol?: Rol;
  activo: boolean;
  organizacion_id?: string;
  /** Sub del token: lo compara el servidor para `es_propio` (B-14). */
  idp_subject: string;
  /** Unidades asignadas directamente (Monitorista). */
  unidades: string[];
  /** Subordinados directos (Supervisor o Coordinador). */
  subordinados: string[];
}

interface OrganizacionMock {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  activa: boolean;
}

function semillaSujetos(): SujetoMock[] {
  return [
    {
      id: 'SUJ-001',
      nombre: 'Administrador demo',
      identificador_usuario: 'administrador@demo.ai27',
      rol: Rol.Administrador,
      activo: true,
      idp_subject: 'usr-demo-1',
      unidades: [],
      subordinados: [],
    },
    {
      id: 'SUJ-002',
      nombre: 'Lupita Monitorista',
      identificador_usuario: 'lupita.monitorista',
      rol: Rol.Monitorista,
      activo: true,
      idp_subject: 'idp-002',
      unidades: ['UN-1001'],
      subordinados: [],
    },
    {
      id: 'SUJ-003',
      nombre: 'Carlos Supervisor',
      identificador_usuario: 'carlos.supervisor',
      rol: Rol.Supervisor,
      activo: true,
      idp_subject: 'idp-003',
      unidades: [],
      subordinados: ['SUJ-002'],
    },
    {
      id: 'SUJ-004',
      nombre: 'Ana Cliente',
      identificador_usuario: 'ana.cliente',
      rol: Rol.Cliente,
      activo: true,
      organizacion_id: 'ORG-001',
      idp_subject: 'idp-004',
      unidades: [],
      subordinados: [],
    },
    {
      // Usuario anterior a tracer.40: sin nombre ni identificador en `identidad`.
      id: 'SUJ-005',
      rol: Rol.Monitorista,
      activo: false,
      idp_subject: 'idp-005',
      unidades: [],
      subordinados: [],
    },
  ];
}

function semillaOrganizaciones(): OrganizacionMock[] {
  return [
    {
      id: 'ORG-001',
      nombre: 'Transportes Norte',
      correo: 'contacto@norte.mx',
      telefono: '5550001',
      activa: true,
    },
    {
      id: 'ORG-002',
      nombre: 'Logística Sur',
      correo: 'ventas@sur.mx',
      telefono: '5550002',
      activa: true,
    },
    {
      id: 'ORG-003',
      nombre: 'Carga Vieja',
      correo: 'archivo@vieja.mx',
      telefono: '5550003',
      activa: false,
    },
  ];
}

let sujetos = semillaSujetos();
let organizaciones = semillaOrganizaciones();

/** Devuelve el estado simulado a la semilla. Lo usan las pruebas. */
export function reiniciarAdministracionMock(): void {
  sujetos = semillaSujetos();
  organizaciones = semillaOrganizaciones();
}

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                  */
/* -------------------------------------------------------------------------- */

interface Actor {
  readonly rol: Rol;
  readonly sub: string;
}

function actorDe(request: Request): Actor | null {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const claims = decodificarClaims(token);
  if (!claims) return null;
  const rol = rolValido(claims);
  return rol ? { rol, sub: claims.sub } : null;
}

function error(status: number, codigo: string, mensaje: string) {
  return HttpResponse.json({ codigo, mensaje }, { status });
}

function sinSesion() {
  return error(401, 'no_autorizado', 'token ausente o inválido');
}

function prohibido(operacion: string) {
  return error(403, 'prohibido', `el rol no puede invocar ${operacion}`);
}

function noEncontrado(recurso: string) {
  return error(404, 'no_encontrado', `${recurso} no existe`);
}

function esCliente(rol: Rol | undefined): boolean {
  return rol === Rol.Cliente;
}

function activos(): SujetoMock[] {
  return sujetos.filter((sujeto) => sujeto.activo);
}

function administradoresActivos(): number {
  return activos().filter((sujeto) => sujeto.rol === Rol.Administrador).length;
}

function buscarSujeto(id: string): SujetoMock | undefined {
  return sujetos.find((sujeto) => sujeto.id === id);
}

function buscarOrganizacion(id: string): OrganizacionMock | undefined {
  return organizaciones.find((organizacion) => organizacion.id === id);
}

/** Forma de wire de un usuario, con `es_propio` calculado contra el sub del actor. */
function wireUsuario(sujeto: SujetoMock, sub: string): UsuarioAdmin {
  const organizacion =
    esCliente(sujeto.rol) && sujeto.organizacion_id
      ? buscarOrganizacion(sujeto.organizacion_id)
      : undefined;
  return {
    id: sujeto.id,
    ...(sujeto.nombre !== undefined ? { nombre: sujeto.nombre } : {}),
    ...(sujeto.identificador_usuario !== undefined
      ? { identificador_usuario: sujeto.identificador_usuario }
      : {}),
    ...(sujeto.rol !== undefined ? { rol: sujeto.rol } : {}),
    activo: sujeto.activo,
    ...(organizacion ? { organizacion: { id: organizacion.id, nombre: organizacion.nombre } } : {}),
    es_propio: sujeto.idp_subject === sub,
  };
}

function wireOrganizacion(organizacion: OrganizacionMock): OrganizacionWire {
  const usuariosActivos = activos().filter(
    (sujeto) => sujeto.organizacion_id === organizacion.id,
  ).length;
  return {
    id: organizacion.id,
    nombre: organizacion.nombre,
    correo: organizacion.correo,
    telefono: organizacion.telefono,
    activa: organizacion.activa,
    usuarios_activos: usuariosActivos,
  };
}

/** Unidades efectivas: propias más las de los subordinados, por jerarquía (DEC-140 #2). */
function unidadesEfectivas(sujeto: SujetoMock, visitados = new Set<string>()): string[] {
  visitados.add(sujeto.id);
  const resultado = new Set(sujeto.unidades);
  for (const subId of sujeto.subordinados) {
    const sub = buscarSujeto(subId);
    if (!sub || visitados.has(sub.id)) continue;
    for (const unidad of unidadesEfectivas(sub, visitados)) resultado.add(unidad);
  }
  return [...resultado];
}

function wireAlcance(sujeto: SujetoMock): AlcanceSujeto {
  return {
    unidades_ids: [...sujeto.unidades],
    subordinados_ids: [...sujeto.subordinados],
    unidades_efectivas_ids: unidadesEfectivas(sujeto),
  };
}

/** Quita a un sujeto de la lista de subordinados de cualquier superior. */
function quitarDeSuperiores(id: string): void {
  for (const sujeto of sujetos) {
    sujeto.subordinados = sujeto.subordinados.filter((subId) => subId !== id);
  }
}

/** Pagina por cursor: el cursor es el índice de inicio, en texto. */
function paginar<T>(
  items: readonly T[],
  cursor: string | null,
): {
  items: T[];
  cursor_siguiente: string | null;
} {
  const inicio = cursor ? Number(cursor) : 0;
  const fin = inicio + TAMANO_PAGINA;
  return {
    items: items.slice(inicio, fin),
    cursor_siguiente: fin < items.length ? String(fin) : null,
  };
}

function cursorDe(url: URL): string | null {
  return url.searchParams.get('cursor');
}

/* -------------------------------------------------------------------------- */
/* Handlers                                                                    */
/* -------------------------------------------------------------------------- */

export const handlersAdministracion = [
  // GET /sujetos: listado y búsqueda. Solo administrador (DEC-140).
  http.get(path('/sujetos'), ({ request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('listar sujetos');

    const url = new URL(request.url);
    const texto = url.searchParams.get('q')?.toLowerCase();
    const rol = url.searchParams.get('rol');
    const tenant = url.searchParams.get('tenant_id');
    const activo = url.searchParams.get('activo');

    const filtrados = sujetos
      .filter(
        (sujeto) =>
          !texto ||
          (sujeto.nombre ?? '').toLowerCase().includes(texto) ||
          (sujeto.identificador_usuario ?? '').toLowerCase().includes(texto),
      )
      .filter((sujeto) => !rol || sujeto.rol === rol)
      .filter((sujeto) => !tenant || sujeto.organizacion_id === tenant)
      .filter((sujeto) => activo === null || String(sujeto.activo) === activo);

    const pagina = paginar(filtrados, cursorDe(url));
    return HttpResponse.json(
      {
        items: pagina.items.map((sujeto) => wireUsuario(sujeto, actor.sub)),
        cursor_siguiente: pagina.cursor_siguiente,
      },
      { status: 200 },
    );
  }),

  // POST /sujetos: alta. El rol cliente exige organización activa; un rol interno no la admite.
  http.post(path('/sujetos'), async ({ request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('dar de alta un sujeto');

    const cuerpo = (await request.json()) as Partial<AltaSujetoEntrada>;
    const nombre = cuerpo.nombre?.trim() ?? '';
    const identificador = cuerpo.identificador_usuario?.trim() ?? '';
    if (
      !nombre ||
      !identificador ||
      !cuerpo.rol ||
      !(ROLES as readonly string[]).includes(cuerpo.rol)
    ) {
      return error(400, 'validacion', 'nombre, identificador_usuario y rol son obligatorios');
    }
    if (esCliente(cuerpo.rol)) {
      const organizacion = cuerpo.organizacion_id
        ? buscarOrganizacion(cuerpo.organizacion_id)
        : undefined;
      if (!organizacion || !organizacion.activa) {
        return error(400, 'organizacion_invalida', 'la organización no existe o está inactiva');
      }
    } else if (cuerpo.organizacion_id !== undefined) {
      return error(400, 'validacion', 'un rol interno no lleva organización');
    }
    if (
      sujetos.some(
        (sujeto) => sujeto.identificador_usuario?.toLowerCase() === identificador.toLowerCase(),
      )
    ) {
      return error(409, 'conflicto', 'ya existe un usuario con ese identificador');
    }

    const numero = sujetos.length + 1;
    const nuevo: SujetoMock = {
      id: `SUJ-${String(numero).padStart(3, '0')}`,
      nombre,
      identificador_usuario: identificador,
      rol: cuerpo.rol,
      activo: true,
      ...(cuerpo.organizacion_id !== undefined ? { organizacion_id: cuerpo.organizacion_id } : {}),
      idp_subject: `idp-${numero}`,
      unidades: [],
      subordinados: [],
    };
    sujetos.push(nuevo);
    return HttpResponse.json(wireUsuario(nuevo, actor.sub), { status: 201 });
  }),

  // GET /sujetos/:id: detalle. Solo administrador.
  http.get(path('/sujetos/:id'), ({ params, request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('leer un sujeto');
    const sujeto = buscarSujeto(String(params.id));
    if (!sujeto) return noEncontrado('el sujeto');
    return HttpResponse.json(wireUsuario(sujeto, actor.sub), { status: 200 });
  }),

  // PATCH /sujetos/:id: edita el nombre; el identificador es inmutable (PA-10).
  http.patch(path('/sujetos/:id'), async ({ params, request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('editar un sujeto');
    const sujeto = buscarSujeto(String(params.id));
    if (!sujeto) return noEncontrado('el sujeto');
    const cuerpo = (await request.json()) as { nombre?: string };
    const nombre = cuerpo.nombre?.trim() ?? '';
    if (!nombre) return error(400, 'validacion', 'el nombre es obligatorio');
    sujeto.nombre = nombre;
    return HttpResponse.json(wireUsuario(sujeto, actor.sub), { status: 200 });
  }),

  // DELETE /sujetos/:id: desactiva. El último administrador activo no se desactiva (PA-7).
  http.delete(path('/sujetos/:id'), ({ params, request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('desactivar un sujeto');
    const sujeto = buscarSujeto(String(params.id));
    if (!sujeto) return noEncontrado('el sujeto');
    if (sujeto.rol === Rol.Administrador && sujeto.activo && administradoresActivos() === 1) {
      return error(409, 'ultimo_administrador', 'dejaría al sistema sin administrador activo');
    }
    sujeto.activo = false;
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /sujetos/:id/reactivacion
  http.post(path('/sujetos/:id/reactivacion'), ({ params, request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('reactivar un sujeto');
    const sujeto = buscarSujeto(String(params.id));
    if (!sujeto) return noEncontrado('el sujeto');
    sujeto.activo = true;
    return new HttpResponse(null, { status: 204 });
  }),

  // PUT /sujetos/:id/rol: reglas de auto-escalada, desactivado, rol igual, cruce de audiencia
  // y último administrador. Al cambiar de rol se retira el alcance anterior (DEC-140 #3).
  http.put(path('/sujetos/:id/rol'), async ({ params, request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('cambiar un rol');
    const sujeto = buscarSujeto(String(params.id));
    if (!sujeto) return noEncontrado('el sujeto');

    const cuerpo = (await request.json()) as { rol?: Rol };
    const nuevo = cuerpo.rol;
    if (!nuevo || !(ROLES as readonly string[]).includes(nuevo)) {
      return error(400, 'validacion', 'el rol no es válido');
    }
    if (sujeto.idp_subject === actor.sub) {
      return error(403, 'autoescalamiento', 'no puede cambiar su propio rol');
    }
    if (!sujeto.activo) return error(409, 'sujeto_desactivado', 'el sujeto está desactivado');
    if (sujeto.rol === nuevo) return error(409, 'rol_igual', 'el rol nuevo es igual al activo');
    if (esCliente(sujeto.rol) !== esCliente(nuevo)) {
      return error(409, 'rol_cruza_audiencia', 'el cambio cruza entre cliente y rol interno');
    }
    if (sujeto.rol === Rol.Administrador && administradoresActivos() === 1) {
      return error(409, 'ultimo_administrador', 'dejaría al sistema sin administrador activo');
    }

    sujeto.rol = nuevo;
    sujeto.unidades = [];
    sujeto.subordinados = [];
    quitarDeSuperiores(sujeto.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /sujetos/:id/revocaciones: el motivo es obligatorio. Responde cuántas sesiones se revocaron.
  http.post(path('/sujetos/:id/revocaciones'), async ({ params, request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('revocar sesiones');
    const sujeto = buscarSujeto(String(params.id));
    if (!sujeto) return noEncontrado('el sujeto');
    const cuerpo = (await request.json()) as { motivo?: string };
    if (!cuerpo.motivo?.trim()) return error(400, 'validacion', 'el motivo es obligatorio');
    return HttpResponse.json({ sesiones_revocadas: sujeto.activo ? 1 : 0 }, { status: 200 });
  }),

  // GET /sujetos/:id/alcance. El administrador lee cualquiera; el jefe operativo, solo un Monitorista.
  http.get(path('/sujetos/:id/alcance'), ({ params, request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    const sujeto = buscarSujeto(String(params.id));
    if (!sujeto) return noEncontrado('el sujeto');
    const puedeLeer =
      actor.rol === Rol.Administrador ||
      (actor.rol === Rol.JefeOperativo && sujeto.rol === Rol.Monitorista);
    if (!puedeLeer) return prohibido('leer el alcance');
    return HttpResponse.json(wireAlcance(sujeto), { status: 200 });
  }),

  // PUT /sujetos/:id/alcance/unidades: reemplaza las unidades de un Monitorista.
  http.put(path('/sujetos/:id/alcance/unidades'), async ({ params, request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('fijar unidades');
    const sujeto = buscarSujeto(String(params.id));
    if (!sujeto) return noEncontrado('el sujeto');
    if (sujeto.rol !== Rol.Monitorista) {
      return error(409, 'rol_sin_alcance', 'el usuario no tiene rol activo monitorista');
    }
    const cuerpo = (await request.json()) as { unidades_ids?: string[] };
    sujeto.unidades = [...new Set(cuerpo.unidades_ids ?? [])];
    return new HttpResponse(null, { status: 204 });
  }),

  // PUT /sujetos/:id/alcance/subordinados: Monitoristas de un Supervisor o Supervisores de un Coordinador.
  http.put(path('/sujetos/:id/alcance/subordinados'), async ({ params, request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('fijar subordinados');
    const sujeto = buscarSujeto(String(params.id));
    if (!sujeto) return noEncontrado('el sujeto');

    const rolRequerido =
      sujeto.rol === Rol.Supervisor
        ? Rol.Monitorista
        : sujeto.rol === Rol.Coordinador
          ? Rol.Supervisor
          : null;
    if (rolRequerido === null) {
      return error(
        409,
        'rol_sin_alcance',
        'el superior no tiene rol activo supervisor ni coordinador',
      );
    }

    const cuerpo = (await request.json()) as { sujetos_ids?: string[] };
    const ids = [...new Set(cuerpo.sujetos_ids ?? [])];
    for (const id of ids) {
      const subordinado = buscarSujeto(id);
      if (!subordinado || subordinado.rol !== rolRequerido) {
        return error(
          409,
          'subordinado_rol_invalido',
          'un subordinado no tiene el rol que corresponde',
        );
      }
      const otroSuperior = sujetos.some(
        (superior) => superior.id !== sujeto.id && superior.subordinados.includes(id),
      );
      if (otroSuperior) {
        return error(409, 'subordinado_con_superior', 'un subordinado ya tiene otro superior');
      }
    }
    sujeto.subordinados = ids;
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /organizaciones: listado paginado. Solo administrador.
  http.get(path('/organizaciones'), ({ request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('listar organizaciones');
    const url = new URL(request.url);
    const pagina = paginar(organizaciones.map(wireOrganizacion), cursorDe(url));
    return HttpResponse.json(pagina, { status: 200 });
  }),

  // POST /organizaciones: crea. Con `id` repetido devuelve la existente: completa un alta a medias (DEC-144 #2).
  http.post(path('/organizaciones'), async ({ request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('crear una organización');

    const cuerpo = (await request.json()) as Partial<OrganizacionEntrada>;
    const nombre = cuerpo.nombre?.trim() ?? '';
    const correo = cuerpo.correo?.trim() ?? '';
    const telefono = cuerpo.telefono?.trim() ?? '';
    if (!nombre || !correo || !telefono) {
      return error(400, 'validacion', 'nombre, correo y teléfono son obligatorios');
    }
    if (cuerpo.id) {
      const existente = buscarOrganizacion(cuerpo.id);
      if (existente) return HttpResponse.json(wireOrganizacion(existente), { status: 201 });
    }
    if (organizaciones.some((org) => org.nombre.toLowerCase() === nombre.toLowerCase())) {
      return error(
        409,
        'nombre_organizacion_duplicado',
        'ya existe una organización con ese nombre',
      );
    }

    const nueva: OrganizacionMock = {
      id: cuerpo.id ?? `ORG-${String(organizaciones.length + 1).padStart(3, '0')}`,
      nombre,
      correo,
      telefono,
      activa: true,
    };
    organizaciones.push(nueva);
    return HttpResponse.json(wireOrganizacion(nueva), { status: 201 });
  }),

  // PATCH /organizaciones/:id: edita nombre, correo y teléfono. El tenant no cambia.
  http.patch(path('/organizaciones/:id'), async ({ params, request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('editar una organización');
    const organizacion = buscarOrganizacion(String(params.id));
    if (!organizacion) return noEncontrado('la organización');

    const cambios = (await request.json()) as OrganizacionCambios;
    const nombre = cambios.nombre?.trim();
    if (nombre !== undefined) {
      const repetida = organizaciones.some(
        (org) => org.id !== organizacion.id && org.nombre.toLowerCase() === nombre.toLowerCase(),
      );
      if (repetida) {
        return error(
          409,
          'nombre_organizacion_duplicado',
          'ya existe una organización con ese nombre',
        );
      }
      organizacion.nombre = nombre;
    }
    if (cambios.correo !== undefined) organizacion.correo = cambios.correo.trim();
    if (cambios.telefono !== undefined) organizacion.telefono = cambios.telefono.trim();
    return HttpResponse.json(wireOrganizacion(organizacion), { status: 200 });
  }),

  // DELETE /organizaciones/:id: desactivación terminal (PA-8). No revoca sesiones.
  http.delete(path('/organizaciones/:id'), ({ params, request }) => {
    const actor = actorDe(request);
    if (!actor) return sinSesion();
    if (actor.rol !== Rol.Administrador) return prohibido('desactivar una organización');
    const organizacion = buscarOrganizacion(String(params.id));
    if (!organizacion) return noEncontrado('la organización');
    organizacion.activa = false;
    return new HttpResponse(null, { status: 204 });
  }),
];
