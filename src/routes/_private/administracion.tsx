/*
 * Administración del sistema — E8-T19.
 *
 * La pantalla decide el acceso con el rol de la sesión (afordancia de interfaz;
 * la autoridad real la aplica el `bff`). La sección y el usuario viajan en la URL:
 * `?seccion=usuarios|organizaciones` y `?usuario=<id>`.
 */

import { createFileRoute } from '@tanstack/react-router';

import { Administracion } from '@/features/administracion/Administracion';
import type { SeccionAdministracion } from '@/features/administracion/AdministracionAutorizada';

export const Route = createFileRoute('/_private/administracion')({
  validateSearch: (busqueda: Record<string, unknown>) => ({
    seccion: (busqueda.seccion === 'organizaciones'
      ? 'organizaciones'
      : 'usuarios') as SeccionAdministracion,
    usuario: typeof busqueda.usuario === 'string' ? busqueda.usuario : undefined,
  }),
  component: AdministracionRoute,
});

function AdministracionRoute() {
  const { seccion, usuario } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <Administracion
      seccion={seccion}
      usuarioId={usuario ?? null}
      onCambiarSeccion={(nueva) => {
        void navigate({ search: { seccion: nueva, usuario: undefined } });
      }}
    />
  );
}
