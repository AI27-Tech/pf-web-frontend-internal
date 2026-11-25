import { useEffect, useState } from 'react';
import { Button, Inline, Modal } from '@ai27-tech/ui';
import type { EmergenciaViaje } from '@/lib/contracts/emergencias';
import { ErrorAccionNoPermitida, ErrorSinAccesoEmergencias } from '@/lib/api/emergencias';
import { useActivarEmergencia } from './useActivarEmergencia';

/** Resultado de la activación para que el padre lo muestre en una alerta. */
export interface AvisoEmergencia {
  readonly tipo: 'danger';
  readonly mensaje: string;
}

interface AccionEmergenciaProps {
  viajeId: string;
  /** Activación confirmada. Recibe el caso para enfocarlo en el selector. */
  onActivada: (caso: EmergenciaViaje) => void;
  /** El viaje ya es terminal (409): recargar el detalle. */
  onViajeTerminal: () => void;
  /** Éxito o error de la activación. El padre decide dónde mostrarlo. */
  onAviso: (aviso: AvisoEmergencia) => void;
}

/**
 * Botón de emergencia del monitoreo. El padre solo lo monta en estados no terminales
 * (`puedeActivar`). Pide confirmación antes de activar.
 *
 * Solo dibuja el botón y el modal. El aviso lo muestra el padre fuera del encabezado,
 * para que no quede apilado bajo el botón.
 */
export function AccionEmergencia({
  viajeId,
  onActivada,
  onViajeTerminal,
  onAviso,
}: AccionEmergenciaProps) {
  const [confirmando, setConfirmando] = useState(false);
  const { activar, enCurso, error } = useActivarEmergencia(viajeId, {
    // Sin aviso de éxito: la alerta de emergencias activas ya muestra el resultado.
    onActivada,
    onViajeTerminal,
  });

  useEffect(() => {
    if (error) onAviso({ tipo: 'danger', mensaje: mensajeActivacion(error) });
  }, [error, onAviso]);

  const confirmar = async () => {
    setConfirmando(false);
    await activar();
  };

  return (
    <>
      <Button variant="danger" onClick={() => setConfirmando(true)} disabled={enCurso}>
        {enCurso ? 'Activando...' : 'Activar emergencia'}
      </Button>
      <Modal open={confirmando} onClose={() => setConfirmando(false)} title="Activar emergencia">
        <p>Se registrará una emergencia activa para este viaje.</p>
        <Inline gap={2} wrap={false} align="stretch">
          <Button variant="outline" onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void confirmar()} disabled={enCurso}>
            Activar
          </Button>
        </Inline>
      </Modal>
    </>
  );
}

function mensajeActivacion(error: Error): string {
  if (error instanceof ErrorAccionNoPermitida || error instanceof ErrorSinAccesoEmergencias)
    return 'No tienes permiso para activar emergencias en este viaje.';
  return error.message;
}
