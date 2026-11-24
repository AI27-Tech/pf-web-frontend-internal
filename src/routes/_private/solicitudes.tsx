// BRECHA-UI: sin bandeja de solicitudes todavía. Stub de M14 (spec afinacion-roles-modulo-a-modulo, tarea 15).
/*
 * Bandeja de solicitudes. Stub temporal: `cotizacion` aterriza aquí (decisión del Lead 11)
 * y el Jefe Operativo y el Administrador la ven en el menú. Se reemplaza en M14.
 */
import { EmptyState, PageHeader, Stack } from '@ai27-tech/ui';
import { createFileRoute } from '@tanstack/react-router';
import { ClipboardList } from 'lucide-react';
import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';

export const Route = createFileRoute('/_private/solicitudes')({
  component: SolicitudesRoute,
});

function SolicitudesRoute() {
  return (
    <RequiereCapacidad capacidad="solicitud.listar">
      <Stack gap={4}>
        <PageHeader title="Solicitudes" />
        <EmptyState
          icon={<ClipboardList aria-hidden="true" />}
          title="Bandeja de solicitudes pendiente"
          description="Esta pantalla se construye en el módulo M14."
        />
      </Stack>
    </RequiereCapacidad>
  );
}
