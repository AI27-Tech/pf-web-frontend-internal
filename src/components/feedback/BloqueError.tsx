/**
 * Bloque de error con acción de reintento.
 *
 * Composición de `Alert` (variante `danger`, que anuncia con `role="alert"`) y un
 * `Button` "Reintentar" dentro del cuerpo del aviso (decisión D1). Reemplaza el
 * patrón `div role="alert"` + botón que se repetía en varias pantallas.
 */

import { Alert, Button, Inline } from '@ai27-tech/ui';

export interface BloqueErrorProps {
  /** Texto del error que se muestra al usuario. */
  mensaje: string;
  /** Se ejecuta al pulsar "Reintentar". */
  onReintentar: () => void;
}

export function BloqueError({ mensaje, onReintentar }: BloqueErrorProps) {
  return (
    <Alert variant="danger">
      <Inline gap={3} align="center" wrap>
        <span>{mensaje}</span>
        <Button variant="outline" size="sm" onClick={onReintentar}>
          Reintentar
        </Button>
      </Inline>
    </Alert>
  );
}
