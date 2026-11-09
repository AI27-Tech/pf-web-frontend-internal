/*
 * Alta y edición de un custodio (adelanto de E8-T16).
 *
 * Campos del contrato (tracer.39): nombre, teléfono y estado activo/inactivo. La
 * edición envía solo lo que cambió; el servidor crea la versión siguiente.
 */

import { useState } from 'react';

import { Button, Form, FormField, Input, Switch } from '@ai27-tech/ui';

import type { Custodio, CustodioCambios, CustodioEntrada } from '@/lib/contracts/catalogos';

export interface CustodioFormProps {
  /** Custodio a editar; sin él, el formulario es de alta. */
  readonly custodio?: Custodio;
  readonly enviando: boolean;
  readonly error: string | null;
  readonly onGuardar: (
    datos: { id: string; cambios: CustodioCambios } | { entrada: CustodioEntrada },
  ) => void;
  readonly onCancelar: () => void;
}

export function CustodioForm({
  custodio,
  enviando,
  error,
  onGuardar,
  onCancelar,
}: CustodioFormProps) {
  const [nombre, setNombre] = useState(custodio?.nombre ?? '');
  const [telefono, setTelefono] = useState(custodio?.telefono ?? '');
  const [activo, setActivo] = useState((custodio?.estado ?? 'activo') === 'activo');

  const estado = activo ? 'activo' : 'inactivo';
  const cambios: CustodioCambios = custodio
    ? {
        ...(nombre.trim() !== custodio.nombre && { nombre: nombre.trim() }),
        ...(telefono.trim() !== (custodio.telefono ?? '') && { telefono: telefono.trim() }),
        ...(estado !== custodio.estado && { estado }),
      }
    : {};
  const sinCambios = custodio !== undefined && Object.keys(cambios).length === 0;
  const bloqueado = enviando || nombre.trim().length === 0 || sinCambios;

  const enviar = () => {
    if (nombre.trim().length === 0) return;
    if (custodio) {
      onGuardar({ id: custodio.id, cambios });
      return;
    }
    onGuardar({
      entrada: {
        nombre: nombre.trim(),
        estado,
        ...(telefono.trim() && { telefono: telefono.trim() }),
      },
    });
  };

  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        enviar();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-3)' }}
    >
      <FormField label="Nombre" htmlFor="custodio-nombre" required>
        <Input
          id="custodio-nombre"
          value={nombre}
          disabled={enviando}
          onChange={(event) => setNombre(event.target.value)}
        />
      </FormField>

      <FormField label="Teléfono" htmlFor="custodio-telefono">
        <Input
          id="custodio-telefono"
          type="tel"
          value={telefono}
          disabled={enviando}
          onChange={(event) => setTelefono(event.target.value)}
        />
      </FormField>

      <Switch
        label="Custodio activo"
        checked={activo}
        disabled={enviando}
        onChange={(event) => setActivo(event.target.checked)}
      />

      {error && (
        <p
          role="alert"
          className="ui-text-body-sm"
          style={{ margin: 0, color: 'var(--ui-color-error)' }}
        >
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 'var(--ui-space-2)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" type="button" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={bloqueado}>
          {enviando ? 'Guardando...' : 'Guardar custodio'}
        </Button>
      </div>
    </Form>
  );
}
