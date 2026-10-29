/*
 * Layout de la ruta del viaje (E8-T8 / E8-T13).
 *
 * `/viajes/$id` es ruta padre de sus vistas: el detalle (índice) y el histórico.
 * Este layout solo expone el `<Outlet/>` donde se montan las hijas; no renderiza
 * UI propia para no superponerse a ellas.
 */

import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_private/viajes/$id')({
  component: ViajeLayout,
});

function ViajeLayout() {
  return <Outlet />;
}
