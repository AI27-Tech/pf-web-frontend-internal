/*
 * Topbar con la identidad de sesión del usuario.
 *
 * Usa SOLO estilos de @ai27-tech/ui:
 * - Colores: variables CSS de la librería
 * - Tipografía: clases de texto de la librería
 *
 * Altura fija de 3.5rem para quedar alineada con el header del sidebar
 * (que mide 3.5rem en la librería). El cierre de sesión ya no vive aquí:
 * se movió al fondo del sidebar (ver NavigationSidebar).
 */

import { useSession } from '@/context/SessionContext';
import { type Rol } from '@ai27-tech/contracts/roles';

/** Alto de la topbar: coincide con el header del sidebar de la librería. */
const TOPBAR_HEIGHT = '3.5rem';

/** Mapeo de rol a su forma legible en español. */
const rolLabels: Record<Rol, string> = {
  cliente: 'Cliente',
  jefe_operativo: 'Jefe Operativo',
  monitorista: 'Monitorista',
  supervisor: 'Supervisor',
  coordinador: 'Coordinador',
  ejecutivo: 'Ejecutivo',
  reaccion: 'Reacción',
  administrador: 'Administrador',
};

export function SessionTopbar() {
  const { usuario } = useSession();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: TOPBAR_HEIGHT,
        flex: 'none',
        borderBottom: '1px solid var(--ui-color-border)',
        backgroundColor: 'var(--ui-color-surface)',
        padding: `0 var(--ui-space-4)`,
      }}
    >
      {usuario && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--ui-space-2)',
            minWidth: 0,
          }}
        >
          <span
            className="ui-text-title-md"
            style={{
              color: 'var(--ui-color-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {usuario.id}
          </span>
          <span
            className="ui-text-body-sm"
            style={{ color: 'var(--ui-color-text-muted)', whiteSpace: 'nowrap' }}
          >
            {rolLabels[usuario.rol]}
          </span>
        </div>
      )}
    </div>
  );
}
