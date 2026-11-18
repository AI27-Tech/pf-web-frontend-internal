/*
 * Consultas de la administración (tareas 8.1, 9.1, 10.1, 13.1 y 14.1).
 *
 * Cada consulta llama al puerto de administración. Sin reintento automático y sin
 * sondeo. La interfaz muestra solo lo que devuelve el `bff`: no hay actualización
 * optimista. Tras una acción exitosa, `useInvalidarAdministracion` vuelve a leer.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import type { AdministracionPort } from '@/lib/api/administracion';
import { listarTodasUnidades } from '@/lib/api/unidades';
import type { ConsultaUsuarios, Rol, UsuarioResumen } from '@/lib/contracts/administracion';

export const CLAVE_ADMINISTRACION = 'administracion';

function useToken(): string {
  return useSession().sesion?.accessToken ?? '';
}

/** Recorre todas las páginas de un listado de usuarios (para los selectores de alcance). */
async function listarTodosUsuarios(
  port: AdministracionPort,
  consulta: ConsultaUsuarios,
  token: string,
): Promise<UsuarioResumen[]> {
  const items: UsuarioResumen[] = [];
  let cursor: string | undefined;
  do {
    const pagina = await port.listarUsuarios({ ...consulta, cursor }, token);
    items.push(...pagina.items);
    const siguiente = pagina.cursorSiguiente ?? undefined;
    if (siguiente === cursor) break;
    cursor = siguiente;
  } while (cursor);
  return items;
}

/** Una página del listado de usuarios, con filtros y cursor. */
export function useUsuarios(consulta: ConsultaUsuarios) {
  const port = useAdministracionPort();
  const token = useToken();
  return useQuery({
    queryKey: [CLAVE_ADMINISTRACION, 'usuarios', consulta],
    queryFn: () => port.listarUsuarios(consulta, token),
    enabled: port.capacidades.usuarios,
  });
}

/** Detalle de un usuario. */
export function useUsuario(id: string) {
  const port = useAdministracionPort();
  const token = useToken();
  return useQuery({
    queryKey: [CLAVE_ADMINISTRACION, 'usuario', id],
    queryFn: () => port.obtenerUsuario(id, token),
    enabled: port.capacidades.usuarios,
  });
}

/** Organizaciones completas (activas e inactivas). El selector filtra las activas. */
export function useOrganizaciones() {
  const port = useAdministracionPort();
  const token = useToken();
  return useQuery({
    queryKey: [CLAVE_ADMINISTRACION, 'organizaciones'],
    queryFn: () => port.listarOrganizaciones(token),
    enabled: port.capacidades.organizaciones,
  });
}

/** Alcance tal como lo devuelve el `bff`. Solo se lee si `enabled`. */
export function useAlcance(id: string, enabled: boolean) {
  const port = useAdministracionPort();
  const token = useToken();
  return useQuery({
    queryKey: [CLAVE_ADMINISTRACION, 'alcance', id],
    queryFn: () => port.leerAlcance(id, token),
    enabled: enabled && port.capacidades.alcance,
  });
}

/** Unidades del roster para las opciones del alcance de un Monitorista (lectura). */
export function useUnidadesAlcance(enabled: boolean) {
  const token = useToken();
  return useQuery({
    queryKey: [CLAVE_ADMINISTRACION, 'unidades'],
    queryFn: () => listarTodasUnidades(token),
    enabled,
  });
}

/** Usuarios activos de un rol, completos. Son las opciones de subordinados. */
export function useUsuariosDeRol(rol: Rol, enabled: boolean) {
  const port = useAdministracionPort();
  const token = useToken();
  return useQuery({
    queryKey: [CLAVE_ADMINISTRACION, 'usuarios-rol', rol],
    queryFn: () => listarTodosUsuarios(port, { rol, activo: true }, token),
    enabled: enabled && port.capacidades.usuarios,
  });
}

/** Consecuencia de desactivar una organización: usuarios activos que perderían el acceso. */
export function useConsecuenciaOrganizacion(id: string, enabled: boolean) {
  const port = useAdministracionPort();
  const token = useToken();
  return useQuery({
    queryKey: [CLAVE_ADMINISTRACION, 'consecuencia', id],
    queryFn: () => port.consultarConsecuencia(id, token),
    enabled: enabled && port.capacidades.organizaciones,
  });
}

/** Vuelve a leer toda la administración tras una acción exitosa. */
export function useInvalidarAdministracion(): () => Promise<void> {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: [CLAVE_ADMINISTRACION] });
}
