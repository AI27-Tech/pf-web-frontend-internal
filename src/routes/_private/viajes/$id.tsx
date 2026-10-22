/*
 * Detalle del viaje — E8-T8
 *
 * Ruta que renderiza el detalle de un viaje específico. El parámetro `id` se captura
 * desde la URL y se pasa al componente DetalleViaje. Vive en el outlet del AppShell
 * (ruta padre `_private`).
 */

import { createFileRoute } from '@tanstack/react-router';

import { DetalleViaje } from '@/features/viajes/detalle/DetalleViaje';

export const Route = createFileRoute('/_private/viajes/$id')({
  component: DetalleViajeRoute,
});

function DetalleViajeRoute() {
  const { id } = Route.useParams();
  return <DetalleViaje id={id} />;
}
