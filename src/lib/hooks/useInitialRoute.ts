/*
 * Hook para determinar la ruta inicial según el rol del usuario.
 *
 * Usado en la guarda de /_private para redirigir automáticamente
 * a la página de inicio correspondiente del rol (E8-T4).
 *
 * Nota: Las rutas aquí NO incluyen el prefijo /_private porque TanStack Router
 * lo maneja automáticamente. La navegación es dentro del layout _private.
 */

import type { Rol } from '@ai27-tech/contracts/roles';

/**
 * Mapeo de rol → ruta inicial.
 * Cada rol tiene una página de "aterrizaje" que corresponde a su función.
 * Las rutas son relativas a /_private (no incluyen el prefijo).
 */
export function getInitialRouteForRole(rol: Rol): string {
  const routeMap: Record<Rol, string> = {
    // Panel del Jefe Operativo (nuevo, E8-T20)
    jefe_operativo: '/jefe-operativo/panel',

    // Dashboard de monitoreo para Monitorista/Supervisor/Coordinador (E8-T17)
    monitorista: '/monitoreo/dashboard',
    supervisor: '/monitoreo/dashboard',
    coordinador: '/monitoreo/dashboard',

    // Bandeja de conversaciones (E8-T15)
    ejecutivo: '/conversaciones',

    // Bandeja de emergencias (E7-T1)
    reaccion: '/emergencias',

    // Administrador ve el panel del Jefe Operativo (por ahora)
    administrador: '/jefe-operativo/panel',

    // Cliente (no debería llegar aquí; diferente frontend)
    cliente: '/dashboard',
  };

  return routeMap[rol];
}
