/* Captura de una nota de bitácora (E8-T13, tarea 6). V1: solo { texto }. */
import { useRef, useState } from 'react';

import { Button, Form, FormField, Textarea } from '@ai27-tech/ui';

export interface NotaFormProps {
  readonly enviando: boolean;
  readonly onRegistrar: (texto: string) => Promise<void>;
}

/**
 * Registra una entrada append-only en la bitácora. Solo captura texto: en V1 no
 * hay catálogo de tipo de entrada (DEC-105, BRECHAS.md). El contenido es
 * obligatorio; el envío se bloquea mientras una petición está en curso.
 */
export function NotaForm({ enviando, onRegistrar }: NotaFormProps) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const envioEnCurso = useRef(false);

  const confirmar = async () => {
    if (envioEnCurso.current) return;
    const limpio = texto.trim();
    if (limpio.length === 0) {
      setError('Escribe el contenido de la nota.');
      return;
    }
    setError(null);
    envioEnCurso.current = true;
    try {
      await onRegistrar(limpio);
      setTexto('');
    } finally {
      envioEnCurso.current = false;
    }
  };

  return (
    <Form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void confirmar();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-3)' }}
    >
      <FormField label="Nueva nota de bitácora" required error={error ?? undefined}>
        <Textarea
          value={texto}
          onChange={(event) => {
            setTexto(event.target.value);
            if (error) setError(null);
          }}
          disabled={enviando}
          rows={3}
          placeholder="Describe la observación o nota de monitoreo"
        />
      </FormField>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" type="submit" loading={enviando} disabled={enviando}>
          Registrar nota
        </Button>
      </div>
    </Form>
  );
}
