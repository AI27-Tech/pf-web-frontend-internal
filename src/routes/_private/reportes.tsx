/*
 * Reportes — E6
 * Stub temporal: la pestaña debe aterrizar en una pantalla real, no en Not Found.
 */

import { createFileRoute } from '@tanstack/react-router';

import { StubPage } from '@/components/layout/StubPage';
import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';

export const Route = createFileRoute('/_private/reportes')({
  component: ReportesPage,
});

function ReportesPage() {
  return (
    <RequiereCapacidad capacidad="reportes.ver">
      <StubPage
        titulo="Reportes"
        historia="E6"
        descripcion="Aquí irán los reportes del servicio: descarga del viaje, evidencia y los indicadores del periodo."
      />
    </RequiereCapacidad>
  );
}
