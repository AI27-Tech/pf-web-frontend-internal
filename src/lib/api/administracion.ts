/*
 * Puerto de administración (E8-T19).
 *
 * `AdministracionPort` es la costura entre la pantalla y el `bff`. Los nombres
 * de los métodos son del frontend y no coinciden con los `operationId` del `bff`.
 * Hay dos implementaciones:
 *
 * - `ADMINISTRACION_NO_PUBLICADA`: ninguna capacidad, cada método lanza
 *   `ErrorSuperficieNoPublicada`. Es la que entrega el contexto por omisión.
 * - `crearAdministracionHttp()`: el adaptador real sobre los tipos generados de
 *   `@ai27-tech/contracts` (tracer.40). Es el único lugar que conoce el wire de
 *   esta superficie. Hoy `identidad`, el `bff` y el core aún no la sirven (las
 *   rutas responden 404), así que no se inyecta por omisión: se cablea al cerrar
 *   la tarea 16.1.
 *
 * Fuera del puerto por requisito de V1: revocar por `sesion_id`, enumerar
 * sesiones, auditoría, historial, editar tenant, clientes de un Ejecutivo,
 * organización padre y transferencia de usuarios.
 */

import { ApiError } from './errors';
import { request } from './client';
import type {
  AltaOrganizacion,
  AltaUsuario,
  AlcanceEfectivo,
  CambioAlcance,
  ConsecuenciaDesactivacion,
  ConsultaUsuarios,
  DatosOrganizacion,
  Organizacion,
  OrganizacionWire,
  PaginaUsuarios,
  ResultadoRevocacion,
  Rol,
  UsuarioAdmin,
  UsuarioDetalle,
  UsuarioResumen,
  AlcanceSujeto,
  RevocacionSesionesResultado,
} from '@/lib/contracts/administracion';

/** Capacidades publicadas por el `bff`, una por bloque de requisitos. */
export interface CapacidadesPublicadas {
  readonly usuarios: boolean;
  readonly organizaciones: boolean;
  readonly alcance: boolean;
  readonly revocacionMasiva: boolean;
}

export interface AdministracionPort {
  readonly capacidades: CapacidadesPublicadas;

  listarUsuarios(consulta: ConsultaUsuarios, accessToken: string): Promise<PaginaUsuarios>;
  obtenerUsuario(id: string, accessToken: string): Promise<UsuarioDetalle>;
  altaUsuario(alta: AltaUsuario, accessToken: string): Promise<UsuarioDetalle>;
  fijarRol(id: string, rol: Rol, accessToken: string): Promise<void>;
  desactivarUsuario(id: string, accessToken: string): Promise<void>;
  reactivarUsuario(id: string, accessToken: string): Promise<void>;
  editarUsuario(id: string, nombre: string, accessToken: string): Promise<void>;

  listarOrganizaciones(accessToken: string): Promise<Organizacion[]>;
  crearOrganizacion(datos: AltaOrganizacion, accessToken: string): Promise<Organizacion>;
  editarOrganizacion(
    id: string,
    datos: DatosOrganizacion,
    accessToken: string,
  ): Promise<Organizacion>;
  consultarConsecuencia(id: string, accessToken: string): Promise<ConsecuenciaDesactivacion>;
  desactivarOrganizacion(id: string, accessToken: string): Promise<void>;

  leerAlcance(id: string, accessToken: string): Promise<AlcanceEfectivo>;
  fijarAlcance(id: string, cambio: CambioAlcance, accessToken: string): Promise<AlcanceEfectivo>;

  revocarSesiones(id: string, motivo: string, accessToken: string): Promise<ResultadoRevocacion>;
}

/** Se lanza cuando la operación todavía no la publica el `bff`. */
export class ErrorSuperficieNoPublicada extends Error {
  constructor() {
    super('La superficie de administración no está publicada por el bff');
    this.name = 'ErrorSuperficieNoPublicada';
  }
}

function noPublicada(): never {
  throw new ErrorSuperficieNoPublicada();
}

/** Implementación por defecto: ninguna capacidad publicada, ninguna llamada de red. */
export const ADMINISTRACION_NO_PUBLICADA: AdministracionPort = {
  capacidades: {
    usuarios: false,
    organizaciones: false,
    alcance: false,
    revocacionMasiva: false,
  },
  listarUsuarios: async () => noPublicada(),
  obtenerUsuario: async () => noPublicada(),
  altaUsuario: async () => noPublicada(),
  fijarRol: async () => noPublicada(),
  desactivarUsuario: async () => noPublicada(),
  reactivarUsuario: async () => noPublicada(),
  editarUsuario: async () => noPublicada(),
  listarOrganizaciones: async () => noPublicada(),
  crearOrganizacion: async () => noPublicada(),
  editarOrganizacion: async () => noPublicada(),
  consultarConsecuencia: async () => noPublicada(),
  desactivarOrganizacion: async () => noPublicada(),
  leerAlcance: async () => noPublicada(),
  fijarAlcance: async () => noPublicada(),
  revocarSesiones: async () => noPublicada(),
};

/* -------------------------------------------------------------------------- */
/* Adaptador HTTP real (tarea 19.2)                                            */
/* -------------------------------------------------------------------------- */

/** Tiempo máximo de espera de la revocación masiva (R11.3, R11.6). Valor de trabajo. */
export const TIEMPO_ESPERA_REVOCACION_MS = 15_000;

function ruta(id: string, sufijo = ''): string {
  return `/sujetos/${encodeURIComponent(id)}${sufijo}`;
}

/** Traduce el wire de un usuario al modelo de vista. No inventa nombre ni identificador. */
export function mapearUsuario(wire: UsuarioAdmin): UsuarioResumen {
  return {
    id: wire.id,
    ...(wire.nombre !== undefined ? { nombre: wire.nombre } : {}),
    ...(wire.identificador_usuario !== undefined
      ? { identificadorUsuario: wire.identificador_usuario }
      : {}),
    rol: wire.rol ?? null,
    activo: wire.activo,
    ...(wire.organizacion !== undefined
      ? { organizacion: { id: wire.organizacion.id, nombre: wire.organizacion.nombre } }
      : {}),
    esPropio: wire.es_propio,
  };
}

/** Traduce el wire de una organización al modelo de vista. */
export function mapearOrganizacion(wire: OrganizacionWire): Organizacion {
  return {
    id: wire.id,
    nombre: wire.nombre,
    ...(wire.correo !== undefined ? { correo: wire.correo } : {}),
    ...(wire.telefono !== undefined ? { telefono: wire.telefono } : {}),
    activa: wire.activa,
    usuariosActivos: wire.usuarios_activos,
  };
}

function mapearAlcance(wire: AlcanceSujeto): AlcanceEfectivo {
  return {
    unidadesIds: wire.unidades_ids,
    subordinadosIds: wire.subordinados_ids,
    unidadesEfectivasIds: wire.unidades_efectivas_ids,
  };
}

function consultaListado(consulta: ConsultaUsuarios): string {
  const parametros = new URLSearchParams();
  if (consulta.texto) parametros.set('q', consulta.texto);
  if (consulta.rol) parametros.set('rol', consulta.rol);
  if (consulta.organizacionId) parametros.set('tenant_id', consulta.organizacionId);
  if (consulta.activo !== undefined) parametros.set('activo', String(consulta.activo));
  if (consulta.cursor) parametros.set('cursor', consulta.cursor);
  const texto = parametros.toString();
  return texto ? `?${texto}` : '';
}

/** Recorre todas las páginas de un listado paginado por cursor. */
async function todasLasPaginas<T>(ruta: string, accessToken: string): Promise<readonly T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  do {
    const separador = ruta.includes('?') ? '&' : '?';
    const query: string = cursor ? `${separador}cursor=${encodeURIComponent(cursor)}` : '';
    const pagina: { items: T[]; cursor_siguiente: string | null } = await request(
      `${ruta}${query}`,
      { accessToken },
    );
    items.push(...pagina.items);
    // Un cursor repetido cortaría en bucle infinito; se trata como fin.
    cursor = pagina.cursor_siguiente === cursor ? null : pagina.cursor_siguiente;
  } while (cursor);
  return items;
}

/**
 * Adaptador real de `AdministracionPort` sobre el `bff` (tag `administracion`).
 * Solo el administrador escribe; la guarda la aplica el `bff` y aquí no se decide
 * nada: se reenvía y se propaga el `ApiError` con su `codigo`.
 */
export function crearAdministracionHttp(): AdministracionPort {
  return {
    capacidades: {
      usuarios: true,
      organizaciones: true,
      alcance: true,
      revocacionMasiva: true,
    },

    async listarUsuarios(consulta, accessToken) {
      const pagina = await request<PaginaUsuariosWire>(`/sujetos${consultaListado(consulta)}`, {
        accessToken,
      });
      return {
        items: pagina.items.map(mapearUsuario),
        cursorSiguiente: pagina.cursor_siguiente,
      };
    },

    async obtenerUsuario(id, accessToken) {
      const wire = await request<UsuarioAdmin>(ruta(id), { accessToken });
      return mapearUsuario(wire);
    },

    async altaUsuario(alta, accessToken) {
      const wire = await request<UsuarioAdmin>('/sujetos', {
        method: 'POST',
        body: {
          nombre: alta.nombre,
          identificador_usuario: alta.identificadorUsuario,
          rol: alta.rol,
          ...(alta.organizacionId !== undefined ? { organizacion_id: alta.organizacionId } : {}),
        },
        accessToken,
      });
      return mapearUsuario(wire);
    },

    async fijarRol(id, rol, accessToken) {
      await request<void>(ruta(id, '/rol'), { method: 'PUT', body: { rol }, accessToken });
    },

    async desactivarUsuario(id, accessToken) {
      await request<void>(ruta(id), { method: 'DELETE', accessToken });
    },

    async reactivarUsuario(id, accessToken) {
      await request<void>(ruta(id, '/reactivacion'), { method: 'POST', accessToken });
    },

    async editarUsuario(id, nombre, accessToken) {
      await request<UsuarioAdmin>(ruta(id), { method: 'PATCH', body: { nombre }, accessToken });
    },

    async listarOrganizaciones(accessToken) {
      const items = await todasLasPaginas<OrganizacionWire>('/organizaciones', accessToken);
      return items.map(mapearOrganizacion);
    },

    async crearOrganizacion(datos, accessToken) {
      const wire = await request<OrganizacionWire>('/organizaciones', {
        method: 'POST',
        body: {
          ...(datos.id !== undefined ? { id: datos.id } : {}),
          nombre: datos.nombre,
          correo: datos.correo,
          telefono: datos.telefono,
        },
        accessToken,
      });
      return mapearOrganizacion(wire);
    },

    async editarOrganizacion(id, datos, accessToken) {
      const wire = await request<OrganizacionWire>(`/organizaciones/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { nombre: datos.nombre, correo: datos.correo, telefono: datos.telefono },
        accessToken,
      });
      return mapearOrganizacion(wire);
    },

    async consultarConsecuencia(id, accessToken) {
      const organizaciones = await todasLasPaginas<OrganizacionWire>(
        '/organizaciones',
        accessToken,
      );
      const organizacion = organizaciones.find((item) => item.id === id);
      if (!organizacion) {
        throw new ApiError(
          'noEncontrado',
          `Organización ${id} no encontrada`,
          404,
          'organizacion_no_encontrada',
        );
      }
      const usuarios = await todasLasPaginas<UsuarioAdmin>(
        `/sujetos?tenant_id=${encodeURIComponent(id)}&activo=true`,
        accessToken,
      );
      return {
        usuariosActivos: organizacion.usuarios_activos,
        usuarios: usuarios.map((usuario) => ({
          ...(usuario.nombre !== undefined ? { nombre: usuario.nombre } : {}),
          ...(usuario.identificador_usuario !== undefined
            ? { identificadorUsuario: usuario.identificador_usuario }
            : {}),
        })),
      };
    },

    async desactivarOrganizacion(id, accessToken) {
      await request<void>(`/organizaciones/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        accessToken,
      });
    },

    async leerAlcance(id, accessToken) {
      const wire = await request<AlcanceSujeto>(ruta(id, '/alcance'), { accessToken });
      return mapearAlcance(wire);
    },

    async fijarAlcance(id, cambio, accessToken) {
      // Los PUT reemplazan la lista completa y responden 204 (DEC-145): se vuelve
      // a leer para mostrar solo lo que devuelve el `bff`.
      if (cambio.tipo === 'unidades') {
        await request<void>(ruta(id, '/alcance/unidades'), {
          method: 'PUT',
          body: { unidades_ids: cambio.ids },
          accessToken,
        });
      } else {
        await request<void>(ruta(id, '/alcance/subordinados'), {
          method: 'PUT',
          body: { sujetos_ids: cambio.ids },
          accessToken,
        });
      }
      const wire = await request<AlcanceSujeto>(ruta(id, '/alcance'), { accessToken });
      return mapearAlcance(wire);
    },

    async revocarSesiones(id, motivo, accessToken) {
      const wire = await request<RevocacionSesionesResultado>(ruta(id, '/revocaciones'), {
        method: 'POST',
        body: { motivo },
        accessToken,
        signal: AbortSignal.timeout(TIEMPO_ESPERA_REVOCACION_MS),
      });
      return { sesionesRevocadas: wire.sesiones_revocadas };
    },
  };
}

type PaginaUsuariosWire = {
  readonly items: readonly UsuarioAdmin[];
  readonly cursor_siguiente: string | null;
};
