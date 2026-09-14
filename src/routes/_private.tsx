/*
 * Guarda de rutas privadas.
 *
 * `beforeLoad` corre FUERA de React (antes de montar), así que no puede usar
 * useSession: lee el TokenStore directamente. Es la misma fuente que hidrata el
 * SessionContext, así que ambos coinciden.
 *
 * Nota de audiencia (P10): la frontera real es del servidor. Esta guarda es UX
 * —evita pintar pantallas internas sin sesión—, no un punto de autorización.
 */

import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

import { AppShell } from '@/app/shell/AppShell';
import { tokenStore } from '@/lib/api/tokenStore';

export const Route = createFileRoute('/_private')({
  beforeLoad: ({ location }) => {
    if (!tokenStore.cargar()) {
      throw redirect({
        to: '/login',
        // Guardamos el destino para volver tras autenticarse.
        search: { redirect: location.href },
      });
    }
  },
  component: PrivateLayout,
});

function PrivateLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
