/*
 * Bandeja de Emergencias de Reacción (E8-T18).
 * La emergencia abierta viaja en la búsqueda (`caso`) para que el enlace sea compartible.
 */
import { createFileRoute } from '@tanstack/react-router';
import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { BandejaEmergencias } from '@/features/emergencias/BandejaEmergencias';

export const Route = createFileRoute('/_private/emergencias')({
  validateSearch: (search: Record<string, unknown>): { caso?: string } => {
    const valor = typeof search.caso === 'string' ? search.caso : undefined;
    return valor === undefined ? {} : { caso: valor };
  },
  component: EmergenciasRoute,
});

function EmergenciasRoute() {
  const { caso } = Route.useSearch();
  // Bandeja solo para Reacción, supervisor y coordinador; al resto el bff le responde 403.
  return (
    <RequiereCapacidad capacidad="emergencia.bandeja">
      <BandejaEmergencias casoAbierto={caso} />
    </RequiereCapacidad>
  );
}
