import { Alert } from '@ai27-tech/ui';

import { useActivacionEmergencia } from './activacionEmergenciaContexto';

/**
 * Resultado de la última activación de emergencia (éxito o error). Va en el detalle del
 * viaje, junto a la alerta de incidencia abierta.
 */
export function AvisoActivacionEmergencia() {
  const { aviso, cerrarAviso } = useActivacionEmergencia();
  if (!aviso) return null;
  return (
    <Alert variant={aviso.tipo} onDismiss={cerrarAviso}>
      {aviso.mensaje}
    </Alert>
  );
}
