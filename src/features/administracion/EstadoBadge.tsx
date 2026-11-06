import { Badge } from '@ai27-tech/ui';

interface EstadoBadgeProps {
  readonly activo: boolean;
}

/** Estado de un usuario u organización. Solo existen `activo` e `inactivo` (R13.6). */
export function EstadoBadge({ activo }: EstadoBadgeProps) {
  return (
    <Badge variant={activo ? 'secure' : 'neutral'} dot>
      {activo ? 'Activo' : 'Inactivo'}
    </Badge>
  );
}
