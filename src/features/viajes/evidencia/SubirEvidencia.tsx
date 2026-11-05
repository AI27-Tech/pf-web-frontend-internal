import { useState, type ChangeEvent } from 'react';

import { Button, FormField, Input } from '@ai27-tech/ui';

import {
  ErrorAdjuntosProhibido,
  ErrorSubidaFallida,
  ErrorSubidaRechazada,
} from '@/lib/api/adjuntos';

export interface SubirEvidenciaProps {
  readonly subiendo: boolean;
  readonly error: Error | null;
  readonly onSubir: (archivo: File) => void;
}

/** Mensaje para el error de subida. Son de trabajo, sin límites propios del cliente. */
function mensajeErrorSubida(error: Error): string {
  if (error instanceof ErrorSubidaRechazada) return 'La subida fue rechazada por el servidor.';
  if (error instanceof ErrorAdjuntosProhibido) {
    return 'No tienes autorización para subir evidencia a este viaje.';
  }
  if (error instanceof ErrorSubidaFallida) {
    return 'No se pudo transferir el archivo. Vuelve a intentarlo.';
  }
  return 'No se pudo subir la evidencia. Vuelve a intentarlo.';
}

/**
 * Selección y envío de un archivo de evidencia. Si el navegador no entrega nombre o tipo
 * del archivo, no se envía la intención de subida.
 */
export function SubirEvidencia({ subiendo, error, onSubir }: SubirEvidenciaProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const onCambio = (evento: ChangeEvent<HTMLInputElement>) => {
    setArchivo(evento.target.files?.[0] ?? null);
    setAviso(null);
  };

  const onEnviar = () => {
    if (!archivo) return;
    if (archivo.name === '' || archivo.type === '') {
      setAviso('No se pudo determinar el nombre o el tipo del archivo; no se envió la subida.');
      return;
    }
    setAviso(null);
    onSubir(archivo);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-2)' }}>
      <FormField label="Archivo de evidencia" htmlFor="evidencia-archivo">
        <Input id="evidencia-archivo" type="file" onChange={onCambio} disabled={subiendo} />
      </FormField>
      <div>
        <Button
          variant="primary"
          type="button"
          loading={subiendo}
          disabled={!archivo || subiendo}
          onClick={onEnviar}
        >
          Subir evidencia
        </Button>
      </div>
      {aviso && (
        <p className="ui-text-body-sm" role="alert" style={{ margin: 0 }}>
          {aviso}
        </p>
      )}
      {error && (
        <p className="ui-text-body-sm" role="alert" style={{ margin: 0 }}>
          {mensajeErrorSubida(error)}
        </p>
      )}
    </div>
  );
}
