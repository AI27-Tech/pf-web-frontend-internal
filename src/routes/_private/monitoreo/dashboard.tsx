/* Ruta del dashboard de monitoreo (E8-T17, Bloque B). Reemplaza el stub. */

import { createFileRoute } from '@tanstack/react-router';

import { DashboardMonitoreo } from '@/features/monitoreo/dashboard/DashboardMonitoreo';

export const Route = createFileRoute('/_private/monitoreo/dashboard')({
  component: DashboardMonitoreoRoute,
});

function DashboardMonitoreoRoute() {
  return <DashboardMonitoreo />;
}
