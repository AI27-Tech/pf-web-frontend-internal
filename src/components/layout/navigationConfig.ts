/*
 * Configuración de navegación y utilidades.
 *
 * Separadas del componente NavigationSidebar para permitir fast refresh en el
 * componente. Este archivo contiene solo tipos, datos y funciones; no exporta
 * componentes React.
 */
import type { Rol } from '@ai27-tech/contracts/roles';
import type React from 'react';
import {
  Truck,
  MessageSquare,
  AlertTriangle,
  Settings,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Package,
  Users,
} from 'lucide-react';
import { puede, type Capacidad } from '@/lib/permisos';

/** Forma legible en español de cada rol. */
export const rolLabels: Record<Rol, string> = {
  cliente: 'Cliente',
  jefe_operativo: 'Jefe Operativo',
  monitorista: 'Monitorista',
  supervisor: 'Supervisor',
  coordinador: 'Coordinador',
  ejecutivo: 'Ejecutivo',
  reaccion: 'Reacción',
  administrador: 'Administrador',
  cotizacion: 'Cotización',
};

/** Identificador de un grupo de la barra lateral. */
export type GrupoNavegacionId = 'inicio' | 'operacion' | 'gestion';

/**
 * Definición de una entrada de navegación.
 *
 * Lista blanca: la entrada se muestra si el rol tiene `capacidad` (spec
 * `afinacion-roles-modulo-a-modulo`, M1). Un rol que la política no nombra no la
 * ve, incluido cualquier rol futuro. La negación real de acceso la hace el bff.
 */
export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly path: string;
  /** Capacidad que hace visible la entrada. */
  readonly capacidad: Capacidad;
  /** Grupo de la barra lateral al que pertenece la entrada. */
  readonly grupo: GrupoNavegacionId;
}

/** Catálogo de navegación en el orden de la pantalla. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/monitoreo/dashboard',
    capacidad: 'monitoreo.dashboard',
    grupo: 'inicio',
  },
  {
    id: 'panel-jefe-operativo',
    label: 'Pendientes',
    icon: ClipboardList,
    path: '/jefe-operativo/panel',
    capacidad: 'panel.jefeOperativo',
    grupo: 'inicio',
  },
  {
    id: 'solicitudes',
    label: 'Solicitudes',
    icon: ClipboardCheck,
    path: '/solicitudes',
    capacidad: 'solicitud.listar',
    grupo: 'operacion',
  },
  {
    id: 'viajes',
    label: 'Viajes',
    icon: Truck,
    path: '/viajes',
    capacidad: 'viajes.listar',
    grupo: 'operacion',
  },
  {
    id: 'roster',
    label: 'Roster',
    icon: Users,
    path: '/roster',
    capacidad: 'roster.ver',
    grupo: 'operacion',
  },
  {
    id: 'conversaciones',
    label: 'Conversaciones',
    icon: MessageSquare,
    path: '/conversaciones',
    capacidad: 'conversacion.leer',
    grupo: 'operacion',
  },
  {
    id: 'emergencias',
    label: 'Emergencias',
    icon: AlertTriangle,
    path: '/emergencias',
    capacidad: 'emergencia.bandeja',
    grupo: 'operacion',
  },
  {
    id: 'catalogos',
    label: 'Catálogos',
    icon: Package,
    path: '/catalogos',
    capacidad: 'catalogos.ver',
    grupo: 'gestion',
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: BarChart3,
    path: '/reportes',
    capacidad: 'reportes.ver',
    grupo: 'gestion',
  },
  {
    id: 'administracion',
    label: 'Administración',
    icon: Settings,
    path: '/administracion',
    capacidad: 'administracion.usuarios',
    grupo: 'gestion',
  },
];

/** Grupos de la barra lateral, en el orden en que se muestran. */
export const GRUPOS_NAVEGACION: readonly {
  readonly id: GrupoNavegacionId;
  readonly label: string;
}[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'operacion', label: 'Operación' },
  { id: 'gestion', label: 'Gestión' },
];

/**
 * Entradas de navegación visibles para un rol. Afordancia de UI; la negación
 * real la hace el bff. Exportada para poder probarla de forma aislada.
 */
export function entradasVisiblesPara(rol: Rol): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => puede(rol, item.capacidad));
}

/** Grupo de navegación con las entradas visibles para un rol. */
export interface GrupoVisible {
  readonly id: GrupoNavegacionId;
  readonly label: string;
  readonly items: readonly NavItem[];
}

/**
 * Entradas visibles para un rol, agrupadas en el orden de `GRUPOS_NAVEGACION`.
 * Omite los grupos sin entradas visibles para ese rol.
 */
export function gruposVisiblesPara(rol: Rol): readonly GrupoVisible[] {
  const visibles = entradasVisiblesPara(rol);
  return GRUPOS_NAVEGACION.map((grupo) => ({
    ...grupo,
    items: visibles.filter((item) => item.grupo === grupo.id),
  })).filter((grupo) => grupo.items.length > 0);
}
