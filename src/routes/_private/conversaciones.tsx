import { createFileRoute } from '@tanstack/react-router';
import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { BandejaConversaciones } from '@/features/conversaciones/BandejaConversaciones';

export const Route = createFileRoute('/_private/conversaciones')({
  validateSearch: (search: Record<string, unknown>): { conversacion?: string } => {
    const value = typeof search.conversacion === 'string' ? search.conversacion : undefined;
    return value === undefined ? {} : { conversacion: value };
  },
  component: ConversacionesRoute,
});

/** Leen EJE, SUP, COO y ADM; operan EJE y ADM (M10). Los hooks de datos viven dentro de la guarda. */
function ConversacionesRoute() {
  return (
    <RequiereCapacidad capacidad="conversacion.leer">
      <BandejaConversaciones />
    </RequiereCapacidad>
  );
}
