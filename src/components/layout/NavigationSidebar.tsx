/*
 * Barra lateral de navegación compuesta dinámicamente según el rol.
 *
 * Usa SOLO estilos y componentes de @ai27-tech/ui:
 * - Sidebar, SidebarGroup, SidebarItem de la librería
 * - Colapso NATIVO de la librería (props collapsed / onToggleCollapse)
 * - header con la marca, alineado a la topbar
 * - Variables CSS de colores, espaciado y tipografía
 */

import { Sidebar, SidebarGroup, SidebarItem } from '@ai27-tech/ui';
import type { SidebarItemProps } from '@ai27-tech/ui';
import { LogOut } from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';

import { useSession } from '@/context/SessionContext';
import { entradasVisiblesPara } from './navigationConfig';

/**
 * SidebarItem que navega con TanStack Router.
 *
 * `SidebarItem` reenvía props extra al elemento `as`, pero su tipo solo
 * declara atributos HTML, así que `to` (prop de Link) no está en su firma.
 * Este wrapper añade `to` al tipo para pasarlo con seguridad; en runtime la
 * librería lo reenvía al `Link`.
 */
type NavLinkItemProps = SidebarItemProps & { readonly to: string };
const NavLinkItem = SidebarItem as React.ComponentType<NavLinkItemProps>;

interface NavigationSidebarProps {
  /** Estado de colapso controlado desde el AppShell. */
  readonly collapsed: boolean;
  /** Alterna el colapso. La librería pinta el botón cuando esto se pasa. */
  readonly onToggleCollapse: () => void;
  /** Cierra la sesión. Se invoca desde el botón al fondo del sidebar. */
  readonly onLogout: () => void;
}

/**
 * Marca mostrada en el header del sidebar.
 *
 * El header lo renderizamos nosotros, así que somos responsables de adaptarlo
 * al colapso: la librería solo oculta labels/badges de los items, no el header.
 * Contraído mostramos únicamente el logo "A" centrado; expandido, logo + "AI27".
 */
function BrandHeader({ collapsed }: { readonly collapsed: boolean }) {
  return (
    <>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '1.75rem',
          height: '1.75rem',
          flex: 'none',
          borderRadius: 'var(--ui-radius-sm)',
          backgroundColor: 'var(--ui-color-primary)',
          color: 'var(--ui-color-on-primary)',
          fontWeight: 700,
        }}
      >
        A
      </span>
      {!collapsed && <span>AI27</span>}
    </>
  );
}

export function NavigationSidebar({
  collapsed,
  onToggleCollapse,
  onLogout,
}: NavigationSidebarProps) {
  const { usuario } = useSession();
  const location = useLocation();

  if (!usuario) {
    return (
      <Sidebar
        header={<BrandHeader collapsed={collapsed} />}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      >
        <SidebarGroup>
          <div
            style={{
              padding: 'var(--ui-space-2)',
              fontSize: 'var(--ui-font-size-sm)',
              color: 'var(--ui-color-text-muted)',
            }}
          >
            Sin sesión disponible
          </div>
        </SidebarGroup>
      </Sidebar>
    );
  }

  // Mostrar todas las áreas salvo las que la tarea oculta para este rol.
  const visibleItems = entradasVisiblesPara(usuario.rol);

  return (
    <Sidebar
      header={<BrandHeader collapsed={collapsed} />}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    >
      <SidebarGroup>
        {visibleItems.length === 0 ? (
          <div
            style={{
              padding: 'var(--ui-space-2)',
              fontSize: 'var(--ui-font-size-sm)',
              color: 'var(--ui-color-text-muted)',
            }}
          >
            Sin permisos para acceder
          </div>
        ) : (
          visibleItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLinkItem
                key={item.id}
                as={Link}
                to={item.path}
                active={isActive}
                icon={<IconComponent />}
                label={item.label}
              >
                {item.label}
              </NavLinkItem>
            );
          })
        )}
      </SidebarGroup>

      {/*
        Grupo de sesión empujado al fondo del nav con margin-top:auto, de modo
        que el botón de cerrar sesión quede al pie de la lista y por ARRIBA del
        botón de contraer que la librería pinta en su footer.
      */}
      <SidebarGroup style={{ marginTop: 'auto' }}>
        <SidebarItem icon={<LogOut />} label="Cerrar sesión" onClick={onLogout}>
          Cerrar sesión
        </SidebarItem>
      </SidebarGroup>
    </Sidebar>
  );
}
