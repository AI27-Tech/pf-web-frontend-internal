/*
 * Formulario de captura de ETA estimado manual (E8-T8).
 *
 * Proporciona un campo de entrada (datetime ISO 8601) para fijar el ETA estimado
 * del viaje. Se monta dentro de un Modal desde DetalleViaje. La aportación del
 * operador se valida y se envía al BFF vía `onConfirm`.
 *
 * La marca "estimado, no en vivo" se muestra para aclarar que es una entrada manual,
 * no una derivación automática del GPS.
 */

import { useState } from 'react';

import { Button, Form, FormField, Input } from '@ai27-tech/ui';

export interface EtaFormProps {
  /** ETA actual (ISO 8601), si existe, para precargar el campo. */
  readonly etaActual?: string | undefined;
  /** Callback al confirmar: recibe el ETA en ISO 8601. Retorna una Promise. */
  readonly onConfirm: (eta_estimado: string) => Promise<void>;
  /** Callback al cancelar; cierra el modal. */
  readonly onCancel: () => void;
}

/**
 * Captura del ETA estimado manual para el viaje.
 *
 * Estructura:
 * - Campo de entrada de datetime (ISO 8601)
 * - Marca "estimado, no en vivo"
 * - Botones Confirmar/Cancelar
 *
 * Comportamiento:
 * - Valida que el campo esté completo antes de enviar
 * - Deshabilita botones durante carga
 * - Propaga error si la mutación falla (capturado por el padre)
 */
export function EtaForm({ etaActual, onConfirm, onCancel }: EtaFormProps) {
  const [eta, setEta] = useState(etaActual ?? '');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleConfirm = async () => {
    // Validar que el campo esté completo
    if (!eta.trim()) {
      setError('Por favor, ingresa una fecha y hora válida.');
      return;
    }

    try {
      setError(null);
      setCargando(true);
      await onConfirm(eta);
    } catch (err) {
      // El error se captura y se muestra en el campo
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar el ETA. Por favor, reintenta.',
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
        <FormField label="ETA estimado" required>
          <Input
            type="datetime-local"
            value={eta}
            onChange={(e) => {
              setEta(e.target.value);
              setError(null);
            }}
            placeholder="DD/MM/YYYY HH:MM"
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

      {/* Marca: "estimado, no en vivo" */}
      <p
        className="ui-text-body-xs"
        style={{ color: 'var(--ui-color-text-muted)', fontStyle: 'italic', margin: 0 }}
      >
        ℹ️ Valor estimado, no en vivo.
      </p>

      {/* Botones: Confirmar / Cancelar */}
      <div style={{ display: 'flex', gap: 'var(--ui-space-2)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} disabled={cargando} type="button">
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={cargando} type="submit">
          {cargando ? 'Guardando...' : 'Confirmar'}
        </Button>
      </div>
    </Form>
  );
}
