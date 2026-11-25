/* Ruta privada del flujo de creación de viaje por Operación (E8-T11). */

import { createFileRoute } from '@tanstack/react-router';

import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { CrearViaje } from '@/features/viajes/crear/CrearViaje';

export const Route = createFileRoute('/_private/viajes/crear')({
  component: CrearViajeRoute,
});

function CrearViajeRoute() {
  return (
    <RequiereCapacidad capacidad="viaje.crear">
      <CrearViaje />
    </RequiereCapacidad>
  );
}
