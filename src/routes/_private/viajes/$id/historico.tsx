/* Ruta del histórico append-only del viaje (E8-T13, tarea 2). */

import { createFileRoute } from '@tanstack/react-router';

import { HistoricoViaje } from '@/features/viajes/historico/HistoricoViaje';

export const Route = createFileRoute('/_private/viajes/$id/historico')({
  component: HistoricoViajeRoute,
});

function HistoricoViajeRoute() {
  const { id } = Route.useParams();
  return <HistoricoViaje id={id} />;
}
