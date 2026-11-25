import { Alert } from '@ai27-tech/ui';
import type { EmergenciaViaje } from '@/lib/contracts/emergencias';

export interface AlertaEmergenciasActivasProps {
  readonly casos: readonly EmergenciaViaje[];
}

/**
 * Alerta persistente de las emergencias abiertas del viaje. Roja si hay casos sin atender
 * (`abierta`, sin responsable de Reacción); ámbar si todos están en atención. Con solo
 * casos resueltos, o sin casos, no se muestra. No se cierra a mano: desaparece cuando
 * ya no quedan casos abiertos ni en atención.
 */
export function AlertaEmergenciasActivas({ casos }: AlertaEmergenciasActivasProps) {
  const sinAtender = casos.filter((c) => c.estado === 'abierta').length;
  const enAtencion = casos.filter((c) => c.estado === 'en_atencion').length;

  if (sinAtender === 0 && enAtencion === 0) return null;

  if (sinAtender > 0) {
    const plural = sinAtender === 1 ? 'emergencia' : 'emergencias';
    const extra = enAtencion > 0 ? ` ${enAtencion} en atención.` : '';
    return (
      <Alert variant="danger" title="Emergencia activa">
        {`${sinAtender} ${plural} sin atender. Reacción aún no la ha reclamado.${extra}`}
      </Alert>
    );
  }

  const plural = enAtencion === 1 ? 'emergencia' : 'emergencias';
  return (
    <Alert variant="warning" title="Emergencia en atención">
      {`${enAtencion} ${plural} en atención.`}
    </Alert>
  );
}
