/*
 * Stub para la sección de Monitoreo.
 * Será reemplazado por E8-T17.
 */

import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_private/monitoreo')({
  component: MonitoreoLayout,
});

function MonitoreoLayout() {
  return <Outlet />;
}
