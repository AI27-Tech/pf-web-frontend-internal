/*
 * Alta y edición de un vehículo de la flota de AI27 (adelanto de E8-T16).
 *
 * Campos del contrato (tracer.39): tipo coche/moto, económico, placas y estado
 * activa/inactiva. Sin cliente: la flota es de AI27 (DEC-143). La edición envía
 * solo lo que cambió; el servidor crea la versión siguiente.
 */

import { useState } from 'react';

import { Alert, Button, Form, FormField, Inline, Input, Radio, Switch } from '@ai27-tech/ui';

import type { Vehiculo, VehiculoCambios, VehiculoEntrada } from '@/lib/contracts/catalogos';

type TipoVehiculo = VehiculoEntrada['tipo'];

export interface VehiculoFormProps {
  /** Vehículo a editar; sin él, el formulario es de alta. */
  readonly vehiculo?: Vehiculo;
  readonly enviando: boolean;
  readonly error: string | null;
  readonly onGuardar: (
    datos: { id: string; cambios: VehiculoCambios } | { entrada: VehiculoEntrada },
  ) => void;
  readonly onCancelar: () => void;
}

export function VehiculoForm({
  vehiculo,
  enviando,
  error,
  onGuardar,
  onCancelar,
}: VehiculoFormProps) {
  const [tipo, setTipo] = useState<TipoVehiculo | undefined>(vehiculo?.tipo);
  const [economico, setEconomico] = useState(vehiculo?.economico ?? '');
  const [placas, setPlacas] = useState(vehiculo?.placas ?? '');
  const [activa, setActiva] = useState((vehiculo?.estado ?? 'activa') === 'activa');

  const estado = activa ? 'activa' : 'inactiva';
  const cambios: VehiculoCambios = vehiculo
    ? {
        ...(tipo !== undefined && tipo !== vehiculo.tipo && { tipo }),
        ...(economico.trim() !== (vehiculo.economico ?? '') && { economico: economico.trim() }),
        ...(placas.trim() !== (vehiculo.placas ?? '') && { placas: placas.trim() }),
        ...(estado !== vehiculo.estado && { estado }),
      }
    : {};
  const sinCambios = vehiculo !== undefined && Object.keys(cambios).length === 0;
  const bloqueado = enviando || tipo === undefined || sinCambios;

  const enviar = () => {
    if (tipo === undefined) return;
    if (vehiculo) {
      onGuardar({ id: vehiculo.id, cambios });
      return;
    }
    onGuardar({
      entrada: {
        tipo,
        estado,
        ...(economico.trim() && { economico: economico.trim() }),
        ...(placas.trim() && { placas: placas.trim() }),
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
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="ui-text-body-sm">Tipo de vehículo</legend>
        <Inline gap={3} align="stretch" wrap={false}>
          {(['coche', 'moto'] as const).map((opcion) => (
            <Radio
              key={opcion}
              name="tipo-vehiculo"
              value={opcion}
              label={opcion === 'coche' ? 'Coche' : 'Moto'}
              checked={tipo === opcion}
              disabled={enviando}
              onChange={() => setTipo(opcion)}
            />
          ))}
        </Inline>
      </fieldset>

      <FormField label="Económico" htmlFor="vehiculo-economico">
        <Input
          id="vehiculo-economico"
          value={economico}
          disabled={enviando}
          onChange={(event) => setEconomico(event.target.value)}
        />
      </FormField>

      <FormField label="Placas" htmlFor="vehiculo-placas">
        <Input
          id="vehiculo-placas"
          value={placas}
          disabled={enviando}
          onChange={(event) => setPlacas(event.target.value)}
        />
      </FormField>

      <Switch
        label="Vehículo activo"
        checked={activa}
        disabled={enviando}
        onChange={(event) => setActiva(event.target.checked)}
      />

      {error && <Alert variant="danger">{error}</Alert>}

      <Inline gap={2} align="stretch" justify="end" wrap={false}>
        <Button variant="secondary" type="button" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={bloqueado}>
          {enviando ? 'Guardando...' : 'Guardar vehículo'}
        </Button>
      </Inline>
    </Form>
  );
}
