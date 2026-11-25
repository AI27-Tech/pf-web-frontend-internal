import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Alert, Button, Inline, Stack } from '@ai27-tech/ui';
import {
  ErrorAdjuntosProhibido,
  ErrorSubidaFallida,
  ErrorSubidaRechazada,
} from '@/lib/api/adjuntos';
import { ErrorViajeInexistente } from '@/lib/api/expediente';

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
  if (error instanceof ErrorViajeInexistente) return 'Viaje no encontrado.';
  if (error instanceof ErrorSubidaFallida) {
    return 'No se pudo transferir el archivo. Vuelve a intentarlo.';
  }
  return 'No se pudo subir la evidencia. Vuelve a intentarlo.';
}

/**
 * Selección y envío de un archivo de evidencia. El input nativo queda oculto y se abre
 * desde un botón; el nombre del archivo elegido se muestra junto a él. Si el navegador no
 * entrega nombre o tipo del archivo, no se envía la intención de subida.
 */
export function SubirEvidencia({ subiendo, error, onSubir }: SubirEvidenciaProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const estabaSubiendo = useRef(false);

  // Al terminar una subida sin error, la selección se limpia: el archivo ya está en la lista.
  // Si falla, se conserva para reintentar.
  useEffect(() => {
    if (subiendo) {
      estabaSubiendo.current = true;
      return;
    }
    if (estabaSubiendo.current) {
      estabaSubiendo.current = false;
      if (!error) {
        // La subida terminó sin error: el archivo ya está en la lista, así que se libera la selección.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setArchivo(null);
        if (inputRef.current) inputRef.current.value = '';
      }
    }
  }, [subiendo, error]);

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
    <Stack gap={2}>
      <Inline gap={3} align="center" wrap>
        <input
          ref={inputRef}
          type="file"
          aria-label="Archivo de evidencia"
          hidden
          onChange={onCambio}
          disabled={subiendo}
        />
        <Button
          variant="secondary"
          type="button"
          disabled={subiendo}
          onClick={() => inputRef.current?.click()}
        >
          Seleccionar archivo
        </Button>
        <span
          className="ui-text-body-sm"
          style={{ color: archivo ? 'var(--ui-color-text)' : 'var(--ui-color-text-muted)' }}
        >
          {archivo ? archivo.name : 'Ningún archivo seleccionado'}
        </span>
        <Button
          variant="primary"
          type="button"
          loading={subiendo}
          disabled={!archivo || subiendo}
          onClick={onEnviar}
        >
          Subir evidencia
        </Button>
      </Inline>
      {aviso && <Alert variant="danger">{aviso}</Alert>}
      {error && <Alert variant="danger">{mensajeErrorSubida(error)}</Alert>}
    </Stack>
  );
}
