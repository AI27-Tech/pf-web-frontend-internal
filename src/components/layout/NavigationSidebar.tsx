/*
 * Barra lateral de navegación compuesta dinámicamente según el rol.
 *
 * Usa SOLO estilos y componentes de @ai27-tech/ui:
 * - Sidebar, SidebarGroup, SidebarItem de la librería
 * - Colapso NATIVO de la librería (props collapsed / onToggleCollapse)
 * - header con la marca y headerCollapsed con solo el logo
 * - Variables CSS de colores, espaciado y tipografía
 */

import { Sidebar, SidebarGroup, SidebarItem } from '@ai27-tech/ui';
import type { SidebarItemProps } from '@ai27-tech/ui';
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';

import { useSession } from '@/context/SessionContext';
import { ConfiguracionModal } from './ConfiguracionModal';
import { gruposVisiblesPara } from './navigationConfig';

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
  /** Cierra la sesión. Se invoca desde el modal de configuración. */
  readonly onLogout: () => void;
}

/**
 * Marca del sidebar. Desde @ai27-tech/ui 0.3.0-beta.2 la librería muestra
 * `header` expandido y `headerCollapsed` contraído (sin este último, el
 * encabezado queda vacío al contraer). Expandido: logo + "AI27"; contraído:
 * solo el logo "A".
 */
function BrandHeader({ showName }: { readonly showName: boolean }) {
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
      {showName && <span>AI27</span>}
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
  const [configuracionAbierta, setConfiguracionAbierta] = useState(false);

  if (!usuario) {
    return (
      <Sidebar
        header={<BrandHeader showName />}
        headerCollapsed={<BrandHeader showName={false} />}
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

  // Entradas agrupadas por área (Inicio, Operación, Gestión) y filtradas por rol.
  const grupos = gruposVisiblesPara(usuario.rol);

  return (
    <Sidebar
      header={<BrandHeader showName />}
      headerCollapsed={<BrandHeader showName={false} />}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    >
      {grupos.length === 0 ? (
        <SidebarGroup>
          <div
            style={{
              padding: 'var(--ui-space-2)',
              fontSize: 'var(--ui-font-size-sm)',
              color: 'var(--ui-color-text-muted)',
            }}
          >
            Sin permisos para acceder
          </div>
        </SidebarGroup>
      ) : (
        grupos.map((grupo) => (
          <SidebarGroup key={grupo.id} label={grupo.label}>
            {grupo.items.map((item) => {
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
            })}
          </SidebarGroup>
        ))
      )}

      {/* Grupo de cuenta: sigue el orden de los demás grupos, después de Gestión. */}
      <SidebarGroup label="Cuenta">
        <SidebarItem
          icon={<SlidersHorizontal />}
          label="Configuración"
          onClick={() => setConfiguracionAbierta(true)}
        >
          Configuración
        </SidebarItem>
      </SidebarGroup>

      <ConfiguracionModal
        open={configuracionAbierta}
        onClose={() => setConfiguracionAbierta(false)}
        usuario={usuario}
        onLogout={onLogout}
      />
    </Sidebar>
  );
}
