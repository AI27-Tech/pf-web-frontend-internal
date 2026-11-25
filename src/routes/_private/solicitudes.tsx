/*
 * Solicitudes (M14, spec afinacion-roles-modulo-a-modulo). Bandeja y detalle de las solicitudes
 * pagadas del Jefe Operativo y de todas las del rol `cotizacion` y el Administrador. La pantalla
 * decide por rol con la capacidad `solicitud.listar` (afordancia; la autoridad es el `bff`). La
 * solicitud abierta viaja en `?id=`.
 */
import { createFileRoute } from '@tanstack/react-router';
import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { Solicitudes } from '@/features/solicitudes/Solicitudes';

export const Route = createFileRoute('/_private/solicitudes')({
  validateSearch: (busqueda: Record<string, unknown>) => ({
    id: typeof busqueda.id === 'string' && busqueda.id !== '' ? busqueda.id : undefined,
    vista: busqueda.vista === 'conversaciones' ? ('conversaciones' as const) : undefined,
    conversacion:
      typeof busqueda.conversacion === 'string' && busqueda.conversacion !== ''
        ? busqueda.conversacion
        : undefined,
  }),
  component: SolicitudesRoute,
});

function SolicitudesRoute() {
  const { id, vista, conversacion } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <RequiereCapacidad capacidad="solicitud.listar">
      <Solicitudes
        id={id ?? null}
        vista={vista ?? 'solicitudes'}
        conversacion={conversacion}
        onAbrir={(abierta) =>
          void navigate({ search: { id: abierta, vista: undefined, conversacion: undefined } })
        }
        onVolver={() =>
          void navigate({ search: { id: undefined, vista: undefined, conversacion: undefined } })
        }
        onCambiarVista={(nueva) =>
          void navigate({
            search: {
              id: undefined,
              vista: nueva === 'conversaciones' ? nueva : undefined,
              conversacion: undefined,
            },
          })
        }
        onSeleccionarConversacion={(abierta) =>
          void navigate({
            search: { id: undefined, vista: 'conversaciones', conversacion: abierta },
          })
        }
        onVerViaje={(viajeId) => void navigate({ to: '/viajes/$id', params: { id: viajeId } })}
      />
    </RequiereCapacidad>
  );
}
