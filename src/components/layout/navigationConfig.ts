/*
 * Configuración de navegación y utilidades.
 *
 * Separadas del componente NavigationSidebar para permitir fast refresh en el
 * componente. Este archivo contiene solo tipos, datos y funciones; no exporta
 * componentes React.
 */

import type { Rol } from '@ai27-tech/contracts/roles';
import type React from 'react';
import { Truck, MessageSquare, AlertTriangle, Settings, BarChart3, Package } from 'lucide-react';

/**
 * Definición de una entrada de navegación.
 *
 * Por E8-T4, la navegación muestra las seis áreas y la afordancia de UI solo
 * ESCONDE entradas en los casos que la fuente especifica explícitamente; la
 * negación real de acceso la hace el bff, no esta lista. Por eso el modelo es
 * "oculta para estos roles", no "permitida solo para estos roles": así no se
 * inventan restricciones que la tarea no pide.
 */
export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly path: string;
  /**
   * Roles para los que la entrada se oculta en la UI. Vacío = visible para
   * todos los roles internos. La única regla explícita de E8-T4 es que
   * `reaccion` no ve Reportes ni Catálogos (DEC-022 #9).
   */
  readonly ocultarPara: readonly Rol[];
}

/**
 * Catálogo de navegación: las seis áreas de E8-T4, en el orden de la tarea
 * (Viajes · Conversaciones · Emergencias · Catálogos · Reportes · Administración).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'viajes',
    label: 'Viajes',
    icon: Truck,
    path: '/viajes',
    ocultarPara: [],
  },
  {
    id: 'conversaciones',
    label: 'Conversaciones',
    icon: MessageSquare,
    path: '/conversaciones',
    ocultarPara: [],
  },
  {
    id: 'emergencias',
    label: 'Emergencias',
    icon: AlertTriangle,
    path: '/emergencias',
    ocultarPara: [],
  },
  {
    id: 'catalogos',
    label: 'Catálogos',
    icon: Package,
    path: '/catalogos',
    // DEC-022 #9: Reacción no ve catálogos.
    ocultarPara: ['reaccion'],
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: BarChart3,
    path: '/reportes',
    // DEC-022 #9: Reacción no ve reportes.
    ocultarPara: ['reaccion'],
  },
  {
    id: 'administracion',
    label: 'Administración',
    icon: Settings,
    path: '/administracion',
    ocultarPara: [],
  },
];

/**
 * Entradas de navegación visibles para un rol: todas las áreas salvo las que la
 * tarea oculta para ese rol. Es la afordancia de UI de E8-T4 (la negación real
 * la hace el bff). Exportada para poder probarla de forma aislada.
 */
export function entradasVisiblesPara(rol: Rol): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => !item.ocultarPara.includes(rol));
}
