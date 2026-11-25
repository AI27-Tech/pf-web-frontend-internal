/*
 * Topbar con la identidad de sesión del usuario.
 *
 * Usa SOLO estilos de @ai27-tech/ui:
 * - Colores: variables CSS de la librería
 * - Tipografía: clases de texto de la librería
 *
 * Altura fija de 3.5rem para quedar alineada con el header del sidebar
 * (que mide 3.5rem en la librería). El cierre de sesión vive en el modal de
 * configuración del sidebar (ver ConfiguracionModal).
 */

import { Inline } from '@ai27-tech/ui';
import { useSession } from '@/context/SessionContext';
import { rolLabels } from './navigationConfig';

/** Alto de la topbar: coincide con el header del sidebar de la librería. */
const TOPBAR_HEIGHT = '3.5rem';

export function SessionTopbar() {
  const { usuario } = useSession();

  return (
    <Inline
      gap={0}
      align="center"
      justify="end"
      wrap={false}
      style={{
        height: TOPBAR_HEIGHT,
        flex: 'none',
        borderBottom: '1px solid var(--ui-color-border)',
        backgroundColor: 'var(--ui-color-surface)',
        padding: `0 var(--ui-space-4)`,
      }}
    >
      {usuario && (
        <Inline gap={2} wrap={false} style={{ alignItems: 'baseline', minWidth: 0 }}>
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
        </Inline>
      )}
    </Inline>
  );
}
