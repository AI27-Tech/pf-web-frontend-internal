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
}

/** Catálogo de navegación en el orden de la pantalla. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'panel-jefe-operativo',
    label: 'Panel',
    icon: ClipboardList,
    path: '/jefe-operativo/panel',
    capacidad: 'panel.jefeOperativo',
  },
  {
    id: 'solicitudes',
    label: 'Solicitudes',
    icon: ClipboardCheck,
    path: '/solicitudes',
    capacidad: 'solicitud.listar',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/monitoreo/dashboard',
    capacidad: 'monitoreo.dashboard',
  },
  {
    id: 'viajes',
    label: 'Viajes',
    icon: Truck,
    path: '/viajes',
    capacidad: 'viajes.listar',
  },
  {
    id: 'roster',
    label: 'Roster',
    icon: Users,
    path: '/roster',
    capacidad: 'roster.ver',
  },
  {
    id: 'conversaciones',
    label: 'Conversaciones',
    icon: MessageSquare,
    path: '/conversaciones',
    capacidad: 'conversacion.leer',
  },
  {
    id: 'emergencias',
    label: 'Emergencias',
    icon: AlertTriangle,
    path: '/emergencias',
    capacidad: 'emergencia.bandeja',
  },
  {
    id: 'catalogos',
    label: 'Catálogos',
    icon: Package,
    path: '/catalogos',
    capacidad: 'catalogos.ver',
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: BarChart3,
    path: '/reportes',
    capacidad: 'reportes.ver',
  },
  {
    id: 'administracion',
    label: 'Administración',
    icon: Settings,
    path: '/administracion',
    capacidad: 'administracion.usuarios',
  },
];

/**
 * Entradas de navegación visibles para un rol. Afordancia de UI; la negación
 * real la hace el bff. Exportada para poder probarla de forma aislada.
 */
export function entradasVisiblesPara(rol: Rol): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => puede(rol, item.capacidad));
}
