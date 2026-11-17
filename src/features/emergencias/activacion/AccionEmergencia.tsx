import { useState } from 'react';
import { Alert, Button, Grid, Inline, Modal } from '@ai27-tech/ui';
import type { EmergenciaViaje } from '@/lib/contracts/emergencias';
import { ErrorAccionNoPermitida, ErrorSinAccesoEmergencias } from '@/lib/api/emergencias';
import { useActivarEmergencia } from './useActivarEmergencia';

interface AccionEmergenciaProps {
  viajeId: string;
  /** Activación confirmada. Recibe el caso para enfocarlo en el selector. */
  onActivada: (caso: EmergenciaViaje) => void;
  /** El viaje ya es terminal (409): recargar el detalle. */
  onViajeTerminal: () => void;
}

/**
 * Botón de emergencia del monitoreo. El padre solo lo monta en estados no terminales
 * (`puedeActivar`). Pide confirmación antes de activar.
 */
export function AccionEmergencia({ viajeId, onActivada, onViajeTerminal }: AccionEmergenciaProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const { activar, enCurso, error } = useActivarEmergencia(viajeId, {
    onActivada: (caso) => {
      setAviso('Emergencia activada. Puedes agregar una nota si lo necesitas.');
      onActivada(caso);
    },
    onViajeTerminal,
  });

  const confirmar = async () => {
    setConfirmando(false);
    setAviso(null);
    await activar();
  };

  return (
    <Grid gap={2}>
      <Button variant="secondary" onClick={() => setConfirmando(true)} disabled={enCurso}>
        {enCurso ? 'Activando...' : 'Activar emergencia'}
      </Button>
      {aviso && <Alert variant="success">{aviso}</Alert>}
      {error && <Alert variant="danger">{mensajeActivacion(error)}</Alert>}
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
    </Grid>
  );
}

function mensajeActivacion(error: Error): string {
  if (error instanceof ErrorAccionNoPermitida || error instanceof ErrorSinAccesoEmergencias)
    return 'No tienes permiso para activar emergencias en este viaje.';
  return error.message;
}
