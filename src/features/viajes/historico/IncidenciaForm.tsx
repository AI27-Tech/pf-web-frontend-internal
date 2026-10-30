/* Marcado de una incidencia (E8-T13, tarea 9). tipo_interno es texto en V1. */
import { useRef, useState } from 'react';

import { Button, Form, FormField, Input, Textarea } from '@ai27-tech/ui';

import type { IncidenciaEntrada } from '@/lib/contracts/historicoViaje';

export interface IncidenciaFormProps {
  readonly enviando: boolean;
  readonly onAbrir: (entrada: IncidenciaEntrada) => Promise<void>;
}

/**
 * Marca una incidencia operativa. `tipo_interno` se captura como TEXTO en V1:
 * el contrato lo tipa como `string` y el enum curado llega en una ola posterior
 * (DEC-105). No se inventa un selector cerrado con los ~20 valores de DEC-003.
 * La descripción es opcional. Marcar incidencia NO cambia el estado de progreso
 * del viaje y la vista curada al cliente la compone el `bff` (sin publicación).
 */
export function IncidenciaForm({ enviando, onAbrir }: IncidenciaFormProps) {
  const [tipoInterno, setTipoInterno] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const envioEnCurso = useRef(false);

  const confirmar = async () => {
    if (envioEnCurso.current) return;
    const tipo = tipoInterno.trim();
    if (tipo.length === 0) {
      setError('Indica el tipo interno de la incidencia.');
      return;
    }
    setError(null);
    envioEnCurso.current = true;
    const descripcionLimpia = descripcion.trim();
    try {
      await onAbrir({
        tipo_interno: tipo,
        ...(descripcionLimpia.length > 0 ? { descripcion: descripcionLimpia } : {}),
      });
      setTipoInterno('');
      setDescripcion('');
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
      <FormField
        label="Tipo interno"
        required
        error={error ?? undefined}
        helpText="Catálogo operativo interno. En V1 se captura como texto."
      >
        <Input
          value={tipoInterno}
          onChange={(event) => {
            setTipoInterno(event.target.value);
            if (error) setError(null);
          }}
          disabled={enviando}
          placeholder="Ej. Desvío de ruta"
        />
      </FormField>
      <FormField label="Descripción (opcional)">
        <Textarea
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          disabled={enviando}
          rows={3}
          placeholder="Detalle de la incidencia"
        />
      </FormField>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" type="submit" loading={enviando} disabled={enviando}>
          Marcar incidencia
        </Button>
      </div>
    </Form>
  );
}
