/* Ruta de descarga del expediente del viaje (E8-T17, Bloque A). */

import { createFileRoute } from '@tanstack/react-router';

import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { ExpedienteViaje } from '@/features/viajes/expediente/ExpedienteViaje';

export const Route = createFileRoute('/_private/viajes/$id/expediente')({
  component: ExpedienteViajeRoute,
});

function ExpedienteViajeRoute() {
  const { id } = Route.useParams();
  return (
    <RequiereCapacidad capacidad="monitoreo.consultar">
      <ExpedienteViaje id={id} />
    </RequiereCapacidad>
  );
}
