/*
 * Selector de clientes del flujo E8-T11.
 *
 * Este componente solo conoce el modelo de vista del selector. No importa tipos
 * wire ni decide el alcance de los clientes. La consulta y la adaptación desde
 * el contrato se conectarán cuando el siguiente tracer esté publicado.
 */

import type { ReactNode } from 'react';

import { Button, Card, CardBody, CardFooter, FormField, Select } from '@ai27-tech/ui';

export type EstadoCatalogoClientes = 'brecha' | 'cargando' | 'vacio' | 'error' | 'disponible';

export interface ClienteOption {
  readonly id: string;
  readonly nombre: string;
  /** La fuente decide si una opción puede seleccionarse. */
  readonly disabled?: boolean;
}

export interface ClienteSelectorProps {
  readonly estado: EstadoCatalogoClientes;
  readonly clientes?: readonly ClienteOption[];
  readonly value: string;
  readonly error?: string | undefined;
  readonly disabled?: boolean;
  readonly onChange: (clienteId: string) => void;
  readonly onReintentar?: () => void;
}

export function ClienteSelector({
  estado,
  clientes = [],
  value,
  error,
  disabled = false,
  onChange,
  onReintentar,
}: ClienteSelectorProps) {
  if (estado === 'brecha') {
    return (
      <EstadoCliente error={error}>
        <Card variant="outlined">
          <CardBody>
            <p role="status" style={{ margin: 0 }}>
              El catálogo de clientes todavía no está disponible en el BFF.
            </p>
          </CardBody>
        </Card>
      </EstadoCliente>
    );
  }

  if (estado === 'cargando') {
    return (
      <EstadoCliente error={error}>
        <p role="status">Cargando catálogo de clientes...</p>
      </EstadoCliente>
    );
  }

  if (estado === 'error') {
    return (
      <EstadoCliente error={error}>
        <Card variant="outlined">
          <CardBody>
            <p role="alert" style={{ margin: 0 }}>
              No se pudo cargar el catálogo de clientes.
            </p>
          </CardBody>
          {onReintentar && (
            <CardFooter>
              <Button variant="secondary" type="button" onClick={onReintentar}>
                Reintentar
              </Button>
            </CardFooter>
          )}
        </Card>
      </EstadoCliente>
    );
  }

  if (estado === 'vacio' || clientes.length === 0) {
    return (
      <EstadoCliente error={error}>
        <p role="status">No hay clientes disponibles para tu alcance.</p>
      </EstadoCliente>
    );
  }

  return (
    <FormField label="Cliente" required error={error}>
      <Select
        value={value}
        options={clientes.map((cliente) => ({
          value: cliente.id,
          label: cliente.nombre,
          ...(cliente.disabled === true ? { disabled: true } : {}),
        }))}
        placeholder="Selecciona un cliente"
        onChange={(selected) => onChange(String(selected))}
        disabled={disabled}
      />
    </FormField>
  );
}

function EstadoCliente({
  error,
  children,
}: {
  readonly error?: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <div>
      <p className="ui-text-label-md" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
        Cliente <span aria-hidden="true">*</span>
      </p>
      {children}
      {error && (
        <p role="alert" style={{ color: 'var(--ui-color-error)', margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}
