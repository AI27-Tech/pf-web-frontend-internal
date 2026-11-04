import { Button } from '@ai27-tech/ui';

export interface BotonDescargarExpedienteProps {
  readonly preparando: boolean;
  readonly onDescargar: () => void;
}

/** Botón de descarga. Mientras se prepara el expediente queda deshabilitado. */
export function BotonDescargarExpediente({
  preparando,
  onDescargar,
}: BotonDescargarExpedienteProps) {
  return (
    <Button variant="primary" type="button" disabled={preparando} onClick={onDescargar}>
      {preparando ? 'En preparación' : 'Descargar expediente'}
    </Button>
  );
}
