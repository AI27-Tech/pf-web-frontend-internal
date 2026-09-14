/*
 * Layout base de la consola interna: una sidebar fija a la izquierda y el
 * contenido de la ruta a la derecha.
 *
 * La navegación se define en el arreglo `NAV_GROUPS` y el JSX solo lo itera.
 * Para agregar pestañas, edita ese arreglo: no hace falta tocar el render.
 */

import type { ComponentProps, ReactNode } from 'react';

import { Sidebar, SidebarGroup, SidebarItem } from '@ai27-tech/ui';
import { Link, useRouterState } from '@tanstack/react-router';

import { Topbar } from './Topbar';
import { BookOpenText, FileChartColumn, LayoutDashboard, MessagesSquare, ShieldHalf, ShieldKeyhole, ShieldUser, SquareText, TriangleAlert, Truck } from 'lucide-react';

/*
 * Item de navegación tipado: es un SidebarItem que se pinta como Link de
 * TanStack Router, así acepta props de ruta (`to`, `params`, `search`, ...)
 * con la inferencia del router.
 */
type NavItemProps = ComponentProps<typeof SidebarItem> & ComponentProps<typeof Link>;

function NavItem(props: NavItemProps) {
  return <SidebarItem as={Link} {...props} />;
}

/*
 * Definición de una pestaña de la sidebar.
 *   - `to`     ruta destino (Link de TanStack Router)
 *   - `label`  texto que se muestra (y título accesible al colapsar)
 *   - `icon`   opcional, ícono (por ejemplo, de lucide-react)
 *   - `badge`  opcional, un contador o etiqueta
 *   - `exact`  opcional, si el activo debe coincidir exacto (por defecto:
 *              coincide también con sub-rutas mediante startsWith)
 */
interface NavItem {
  to: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
  exact?: boolean;
}

/*
 * Un grupo de la sidebar con su título y sus items.
 */
interface NavGroup {
  label: string;
  items: NavItem[];
}

/*
 * Navegación de la consola. Agrega aquí tus grupos y pestañas.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Consola de operaciones',
    items: [
      { to: '/', label: 'Centro de Mando', exact: true, icon: <LayoutDashboard size={14} />},
      { to: '/solicitudes', label: 'Solicitudes', icon: <SquareText size={14} />},
      { to: '/asignacion', label: 'Asignación Táctica', icon: <ShieldHalf size={14} />},
      { to: '/monitoreo', label: 'Monitoreo Carga', icon: <Truck size={14} />},
      { to: '/bitacora', label: 'Bitácora y Novedades', icon: <BookOpenText size={14} />},
      { to: '/incidentes', label: 'Incidentes C4', icon: <TriangleAlert size={14} />},
      { to: '/comms', label: 'Comms & WhatsApp', icon: <MessagesSquare size={14} />},
    ],
  },
  {
    label: 'Gestión y auditoria',
    items: [
      { to: '/catalogos', label: 'Catálogos & Flota', icon: <ShieldUser size={14} />},
      { to: '/reportes', label: 'Reportes & BI', icon: <FileChartColumn size={14} />},
      { to: '/acceso', label: 'Control de Acceso', icon: <ShieldKeyhole size={14} />},
    ],
  },
];

export function AppShell({ children }: { readonly children: ReactNode }) {
  // Ruta actual, para marcar el item activo.
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  function isActive(item: NavItem): boolean {
    return item.exact ? pathname === item.to : pathname.startsWith(item.to);
  }

  return (
    <div className="flex h-dvh">
      <Sidebar header={<span className="font-bold text-lg">AI27 TACTICAL</span>}>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} label={group.label}>
            {group.items.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                active={isActive(item)}
                label={item.label}
                icon={item.icon}
                badge={item.badge}
              >
                {item.label}
              </NavItem>
            ))}
          </SidebarGroup>
        ))}
      </Sidebar>

      <div className="bg-surface text-on-surface flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}
