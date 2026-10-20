/*
 * Stub para la sección del Jefe Operativo.
 * Será reemplazado por E8-T20.
 */

import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_private/jefe-operativo')({
  component: JefeOperativoLayout,
});

function JefeOperativoLayout() {
  return <Outlet />;
}
