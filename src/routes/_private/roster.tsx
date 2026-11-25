/*
 * Roster de unidades — E8-T21 (DEC-142). Solo Jefe Operativo y Administrador: la
 * pantalla decide el acceso con el rol de la sesión (afordancia; la autoridad es el
 * `bff`), como la ficha técnica y la administración.
 */

import { createFileRoute } from '@tanstack/react-router';

import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { Roster } from '@/features/roster/Roster';

export const Route = createFileRoute('/_private/roster')({
  component: RosterRoute,
});

function RosterRoute() {
  return (
    <RequiereCapacidad capacidad="roster.ver">
      <Roster />
    </RequiereCapacidad>
  );
}
