/*
 * Formulario de captura de causa para una transición que la requiere (E8-T8, Req 2.5).
 *
 * Se monta dentro de un Modal desde DetalleViaje cuando el destino de la
 * transición exige motivo (rechazos, cancelación; DEC-020 #2). La causa es
 * obligatoria: el botón de confirmar permanece deshabilitado mientras el campo
 * esté vacío.
 *
 * Solo componentes de @ai27-tech/ui; no crea componentes nuevos.
 */

import { useState } from 'react';

import { Button, Form, FormField, Textarea } from '@ai27-tech/ui';

export interface CausaFormProps {
  /** Estado destino de la transición, para contextualizar el formulario. */
  readonly destino: string;
  /** Callback al confirmar: recibe la causa capturada. Retorna una Promise. */
  readonly onConfirm: (causa: string) => Promise<void>;
  /** Callback al cancelar; cierra el modal sin transicionar. */
  readonly onCancel: () => void;
}

/**
 * Captura de la causa (motivo) de una transición.
 *
 * Comportamiento:
 * - La causa es obligatoria: confirmar se deshabilita si el campo está vacío.
 * - Deshabilita los botones durante el envío.
 * - Propaga el error de la mutación al campo (p. ej. carrera 409).
 */
export function CausaForm({ destino, onConfirm, onCancel }: CausaFormProps) {
  const [causa, setCausa] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const causaVacia = causa.trim().length === 0;

  const handleConfirm = async () => {
    if (causaVacia) {
      setError('La causa es obligatoria para esta transición.');
      return;
    }

    try {
      setError(null);
      setCargando(true);
      await onConfirm(causa.trim());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo registrar la transición. Por favor, reintenta.',
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        void handleConfirm();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-3)' }}
    >
      <div>
        <FormField label={`Causa para transicionar a: ${destino}`} required>
          <Textarea
            value={causa}
            onChange={(e) => {
              setCausa(e.target.value);
              setError(null);
            }}
            placeholder="Describe el motivo de esta transición"
            rows={3}
            disabled={cargando}
          />
        </FormField>
        {error && (
          <p
            className="ui-text-body-xs"
            style={{ color: 'var(--ui-color-error)', marginTop: 'var(--ui-space-1)' }}
          >
            {error}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 'var(--ui-space-2)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} disabled={cargando} type="button">
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={cargando || causaVacia}
          type="submit"
        >
          {cargando ? 'Registrando...' : 'Confirmar'}
        </Button>
      </div>
    </Form>
  );
}
