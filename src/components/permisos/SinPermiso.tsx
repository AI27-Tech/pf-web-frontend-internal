import { EmptyState } from '@ai27-tech/ui';
import { ShieldOff } from 'lucide-react';

interface SinPermisoProps {
  readonly titulo?: string;
  readonly descripcion?: string;
}

/**
 * Estado "sin permiso" de una pantalla. La sesión y el menú quedan intactos
 * (Requirement T2): el `403` no cierra sesión.
 */
export function SinPermiso({
  titulo = 'Sin permiso',
  descripcion = 'Tu rol no tiene acceso a esta pantalla.',
}: SinPermisoProps) {
  return (
    <EmptyState
      role="alert"
      icon={<ShieldOff aria-hidden="true" />}
      title={titulo}
      description={descripcion}
    />
  );
}
