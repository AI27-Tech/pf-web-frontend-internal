import { Button } from '@ai27-tech/ui';

export interface BotonDescargarExpedienteProps {
  readonly preparando: boolean;
  readonly onDescargar: () => void;
}

/** Botón de descarga. Mientras se prepara el expediente muestra carga y queda deshabilitado. */
export function BotonDescargarExpediente({
  preparando,
  onDescargar,
}: BotonDescargarExpedienteProps) {
  return (
    <Button
      variant="primary"
      type="button"
      loading={preparando}
      disabled={preparando}
      onClick={onDescargar}
    >
      Descargar expediente
    </Button>
  );
}
