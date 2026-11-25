/* Ruta privada de la ficha técnica del viaje (E8-T12). */

import { createFileRoute } from '@tanstack/react-router';

import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { FichaTecnicaViaje } from '@/features/viajes/ficha/FichaTecnicaViaje';

export const Route = createFileRoute('/_private/viajes/$id/ficha')({
  component: FichaTecnicaRoute,
});

function FichaTecnicaRoute() {
  const { id } = Route.useParams();
  return (
    <RequiereCapacidad capacidad="viaje.ficha.ver">
      <FichaTecnicaViaje id={id} />
    </RequiereCapacidad>
  );
}
