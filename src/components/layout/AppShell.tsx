/*
 * AppShell — Envoltorio de la aplicación privada.
 *
 * Usa SOLO estilos de @ai27-tech/ui:
 * - Variables CSS de colores, espaciado, tipografía
 * - El Sidebar maneja su propio ancho y colapso (no lo forzamos aquí)
 * - Topbar adelgazada y alineada al header del sidebar (3.5rem)
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { useSession } from '@/context/SessionContext';
import { SessionTopbar } from './SessionTopbar';
import { NavigationSidebar } from './NavigationSidebar';

interface AppShellProps {
  children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { usuario, logout } = useSession();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    // Limpia la sesión (contexto + TokenStore) y lleva al login.
    await logout();
    void navigate({ to: '/login' });
  };

  if (!usuario) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 'var(--ui-text-headline-lg-size)',
              fontWeight: 'var(--ui-text-headline-lg-weight)',
              color: 'var(--ui-color-text)',
              margin: 0,
            }}
          >
            Sin sesión activa
          </h1>
          <p
            style={{
              marginTop: 'var(--ui-space-4)',
              fontSize: 'var(--ui-font-size-sm)',
              color: 'var(--ui-color-text-muted)',
            }}
          >
            Por favor, inicia sesión para continuar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar: ocupa la altura completa a la izquierda; maneja su propio ancho.
          El cierre de sesión vive al fondo del sidebar (arriba del botón contraer). */}
      <NavigationSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        onLogout={handleLogout}
      />

      {/* Columna derecha: topbar arriba, contenido debajo */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Topbar adelgazada, alineada a la altura del header del sidebar */}
        <SessionTopbar />

        {/* Área de contenido */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--ui-color-surface-muted)',
            padding: 'var(--ui-space-6)',
            overflow: 'auto',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
