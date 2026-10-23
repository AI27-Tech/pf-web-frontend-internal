/*
 * Guarda de rutas privadas.
 *
 * `beforeLoad` corre FUERA de React (antes de montar), así que no puede usar
 * useSession: lee el TokenStore directamente. Es la misma fuente que hidrata el
 * SessionContext, así que ambos coinciden.
 *
 * Nota de audiencia (P10): la frontera real es del servidor. Esta guarda es UX
 * —evita pintar pantallas internas sin sesión—, no un punto de autorización.
 *
 * E8-T4: PrivateLayout envuelve todas las rutas privadas con AppShell,
 * que compone navegación y topbar dinámicamente según el rol.
 */

import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

import { tokenStore } from '@/lib/api/tokenStore';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Decide la redirección de la guarda privada a partir de si hay sesión y del
 * destino actual. Pura y sin dependencias del router, para poder probarla
 * (E8-T4, definición de terminado: "la guarda redirige conservando ?redirect=").
 *
 * @param haySesion  true si el TokenStore tiene una sesión cargada.
 * @param destino    href actual al que se intentaba entrar.
 * @returns `null` si se permite el paso; o el objeto de redirección a login
 *          con el destino preservado en `search.redirect`.
 */
export function resolverGuardaPrivada(
  haySesion: boolean,
  destino: string,
): { to: '/login'; search: { redirect: string } } | null {
  if (haySesion) return null;
  return { to: '/login', search: { redirect: destino } };
}

export const Route = createFileRoute('/_private')({
  beforeLoad: ({ location }) => {
    const decision = resolverGuardaPrivada(tokenStore.cargar() !== null, location.href);
    if (decision) {
      throw redirect(decision);
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
