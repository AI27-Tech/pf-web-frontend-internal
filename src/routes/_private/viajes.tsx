/*
 * Bandeja operativa de viajes — E8-T7
 * Stub temporal: la pestaña debe aterrizar en una pantalla real, no en Not Found.
 */

import { createFileRoute } from '@tanstack/react-router';

import { StubPage } from '@/components/layout/StubPage';

export const Route = createFileRoute('/_private/viajes')({
  component: ViajesPage,
});

function ViajesPage() {
  return (
    <StubPage
      titulo="Viajes"
      historia="E8-T7"
      descripcion="Aquí irá la bandeja de viajes del alcance del usuario: estado de progreso, condiciones activas (incidencia, sin_senal), filtros y paginación."
    />
  );
}
