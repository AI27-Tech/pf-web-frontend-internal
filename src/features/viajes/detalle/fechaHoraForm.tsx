/*
 * Formulario de captura de la fecha/hora del servicio (E8-T9).
 *
 * Se monta dentro de un Modal desde DetalleViaje cuando la solicitud no tiene
 * `fecha_hora_servicio` y el Jefe Operativo debe completarla antes de aprobar
 * (E1-HU-003). La confirmación permanece deshabilitada mientras el campo esté
 * vacío.
 *
 * Solo componentes de @ai27-tech/ui; no crea componentes nuevos. Usa
 * `DateTimeInput`, igual que la captura de ETA (etaForm.tsx).
 */

import { useState } from 'react';

import { Button, DateTimeInput, Form, FormField, Inline, Stack } from '@ai27-tech/ui';

export interface FechaHoraFormProps {
  /** Fecha/hora actual (ISO 8601), si existe, para precargar el campo. */
  readonly fechaHoraActual?: string | undefined;
  /** Callback al confirmar: recibe la fecha/hora en ISO 8601. Retorna una Promise. */
  readonly onConfirm: (fecha_hora_servicio: string) => Promise<void>;
  /** Callback al cancelar; cierra el modal sin completar. */
  readonly onCancel: () => void;
}

/**
 * Captura de la fecha/hora del servicio.
 *
 * Comportamiento:
 * - La fecha/hora es obligatoria: confirmar se deshabilita si el campo está vacío.
 * - Deshabilita los botones durante el envío.
 * - Propaga el error de la mutación al campo.
 */
export function FechaHoraForm({ fechaHoraActual, onConfirm, onCancel }: FechaHoraFormProps) {
  const [valor, setValor] = useState(fechaHoraActual ?? '');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const campoVacio = valor.trim().length === 0;

  const handleConfirm = async () => {
    if (campoVacio) {
      setError('Por favor, ingresa una fecha y hora válida.');
      return;
    }

    try {
      setError(null);
      setCargando(true);
      await onConfirm(valor);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la fecha y hora. Por favor, reintenta.',
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <Stack
      as={Form}
      gap={3}
      onSubmit={(e) => {
        e.preventDefault();
        void handleConfirm();
      }}
    >
      <div>
        <FormField label="Fecha y hora del servicio" required>
          <DateTimeInput
            value={valor}
            onChange={(nuevo) => {
              setValor(nuevo);
              setError(null);
            }}
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

      <Inline gap={2} align="stretch" justify="end" wrap={false}>
        <Button variant="secondary" onClick={onCancel} disabled={cargando} type="button">
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={cargando || campoVacio}
          type="submit"
        >
          {cargando ? 'Guardando...' : 'Confirmar'}
        </Button>
      </Inline>
    </Stack>
  );
}
