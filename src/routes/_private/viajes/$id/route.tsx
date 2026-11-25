/*
 * Layout de la ruta del viaje (E8-T8 / E8-T13).
 *
 * `/viajes/$id` es ruta padre de sus vistas: detalle, ficha técnica, histórico y
 * expediente. El cascarón `ViajeShell` dibuja el encabezado y las pestañas, y el
 * `Outlet` lleva el contenido de cada sección. Cambiar de pestaña no vuelve a montar
 * el encabezado.
 */
import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';
import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { ViajeShell } from '@/features/viajes/ViajeShell';
import type { SeccionViaje } from '@/features/viajes/NavegacionViaje';

export const Route = createFileRoute('/_private/viajes/$id')({
  component: ViajeLayout,
});

/** Sección que corresponde a la URL actual. */
function seccionDeRuta(pathname: string): SeccionViaje {
  if (pathname.endsWith('/ficha')) return 'ficha';
  if (pathname.endsWith('/historico')) return 'historico';
  if (pathname.endsWith('/expediente')) return 'expediente';
  return 'detalle';
}

function ViajeLayout() {
  const { id } = Route.useParams();
  const { pathname } = useLocation();
  return (
    <RequiereCapacidad capacidad="viaje.ver">
      <ViajeShell id={id} seccion={seccionDeRuta(pathname)}>
        <Outlet />
      </ViajeShell>
    </RequiereCapacidad>
  );
}
