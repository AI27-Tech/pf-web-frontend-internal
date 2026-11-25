/*
 * Alta y edición de una unidad del roster (E8-T21, DEC-142).
 *
 * Se elige un vehículo activo y uno o dos custodios activos; una moto lleva uno.
 * Esa es solo la guía de captura: el `tipo` no se captura (lo deriva el servidor) y
 * la exclusividad, la reserva vigente y la validación final las decide `operacion`.
 * La edición agrega activar o desactivar y envía solo lo que cambió.
 */

import { useState } from 'react';

import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  Form,
  FormField,
  Inline,
  Select,
  Stack,
  Switch,
} from '@ai27-tech/ui';

import type { Custodio, Vehiculo } from '@/lib/contracts/catalogos';
import type { Cliente } from '@/lib/contracts/clientes';
import type { Unidad, UnidadModificacion } from '@/lib/contracts/unidades';

import { etiquetaVehiculo } from '../catalogos/mensajes';
import type { GuardadoUnidad } from './useRoster';

export interface UnidadFormProps {
  /** Unidad a editar; sin ella, el formulario es de alta. */
  readonly unidad?: Unidad;
  readonly vehiculos: readonly Vehiculo[];
  readonly custodios: readonly Custodio[];
  /** Clientes activos para "Cliente al que sirve". */
  readonly clientes: readonly Cliente[];
  readonly enviando: boolean;
  readonly error: string | null;
  readonly onGuardar: (datos: GuardadoUnidad) => void;
  readonly onCancelar: () => void;
}

function mismosIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/** Valor de la opción que quita el cliente; la unidad envía `cliente_id: null`. */
const SIN_CLIENTE = '__sin_cliente__';

export function UnidadForm({
  unidad,
  vehiculos,
  custodios,
  clientes,
  enviando,
  error,
  onGuardar,
  onCancelar,
}: UnidadFormProps) {
  const [vehiculoId, setVehiculoId] = useState(unidad?.vehiculo_id ?? '');
  const [custodiosIds, setCustodiosIds] = useState<readonly string[]>(unidad?.custodios_ids ?? []);
  const [activa, setActiva] = useState(unidad?.activa ?? true);
  // '' = sin cliente. Es opcional y no define el alcance de ningún Monitorista.
  const [clienteId, setClienteId] = useState(unidad?.cliente_id ?? '');
  const clienteActual = unidad?.cliente_id ?? '';
  const clientesOfrecidos = [
    ...clientes.filter((c) => c.estado === 'activo').map((c) => ({ value: c.id, label: c.nombre })),
    // El cliente que la unidad ya tiene, aunque esté desactivado, para poder verlo y quitarlo.
    ...(clienteActual !== '' &&
    !clientes.some((c) => c.id === clienteActual && c.estado === 'activo')
      ? [{ value: clienteActual, label: `${clienteActual} (desactivado)` }]
      : []),
  ];

  // Se ofrecen los activos; en edición, también los que la unidad ya tiene.
  const vehiculosOfrecidos = vehiculos.filter(
    (v) => v.estado === 'activa' || v.id === unidad?.vehiculo_id,
  );
  const custodiosOfrecidos = custodios.filter(
    (c) => c.estado === 'activo' || unidad?.custodios_ids.includes(c.id),
  );
  const vehiculo = vehiculos.find((v) => v.id === vehiculoId);
  const maximo = vehiculo?.tipo === 'moto' ? 1 : 2;
  const excedido = custodiosIds.length > maximo;

  const cambios: UnidadModificacion = unidad
    ? {
        ...(vehiculoId !== unidad.vehiculo_id && { vehiculo_id: vehiculoId }),
        ...(!mismosIds(custodiosIds, unidad.custodios_ids) && { custodios_ids: [...custodiosIds] }),
        ...(activa !== unidad.activa && { activa }),
        // Quitar el cliente envía `null`; no enviar el campo lo deja como está.
        ...(clienteId !== clienteActual && { cliente_id: clienteId === '' ? null : clienteId }),
      }
    : {};
  const sinCambios = unidad !== undefined && Object.keys(cambios).length === 0;
  const bloqueado =
    enviando || vehiculoId === '' || custodiosIds.length === 0 || excedido || sinCambios;

  const alternarCustodio = (id: string, marcado: boolean) =>
    setCustodiosIds((actual) => (marcado ? [...actual, id] : actual.filter((c) => c !== id)));

  const enviar = () => {
    if (bloqueado) return;
    onGuardar(
      unidad
        ? { id: unidad.id, cambios }
        : {
            entrada: {
              vehiculo_id: vehiculoId,
              custodios_ids: [...custodiosIds],
              ...(clienteId !== '' && { cliente_id: clienteId }),
            },
          },
    );
  };

  return (
    <Stack
      as={Form}
      gap={3}
      onSubmit={(event) => {
        event.preventDefault();
        enviar();
      }}
    >
      <FormField label="Vehículo" required>
        <Select
          placeholder="Elige un vehículo"
          value={vehiculoId}
          disabled={enviando}
          options={vehiculosOfrecidos.map((v) => ({
            value: v.id,
            label: `${etiquetaVehiculo(v)} (${v.tipo === 'moto' ? 'moto' : 'coche'})`,
          }))}
          onChange={(valor) => setVehiculoId(String(valor))}
        />
      </FormField>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="ui-text-body-sm">
          Custodios ({vehiculo?.tipo === 'moto' ? 'una moto lleva 1' : 'un coche lleva 1 o 2'})
        </legend>
        {custodiosOfrecidos.length === 0 ? (
          <EmptyState size="sm" title="No hay custodios activos." />
        ) : (
          <Stack gap={1}>
            {custodiosOfrecidos.map((c) => {
              const marcado = custodiosIds.includes(c.id);
              return (
                <Checkbox
                  key={c.id}
                  label={c.nombre}
                  checked={marcado}
                  disabled={enviando || (!marcado && custodiosIds.length >= maximo)}
                  onChange={(event) => alternarCustodio(c.id, event.target.checked)}
                />
              );
            })}
          </Stack>
        )}
        {excedido && <Alert variant="danger">Una moto lleva un solo custodio. Quita uno.</Alert>}
      </fieldset>

      <FormField
        label="Cliente al que sirve"
        showOptional
        helpText="Es informativo: no define qué clientes ve cada Monitorista. Eso se asigna en Clientes de cada Monitorista."
      >
        <Select
          placeholder="Sin cliente"
          value={clienteId === '' ? SIN_CLIENTE : clienteId}
          disabled={enviando}
          options={[{ value: SIN_CLIENTE, label: 'Sin cliente' }, ...clientesOfrecidos]}
          onChange={(valor) => setClienteId(valor === SIN_CLIENTE ? '' : String(valor))}
        />
      </FormField>
      {unidad && (
        <Switch
          label="Unidad activa"
          checked={activa}
          disabled={enviando}
          onChange={(event) => setActiva(event.target.checked)}
        />
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      <Inline gap={2} align="stretch" justify="end" wrap={false}>
        <Button variant="secondary" type="button" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={bloqueado}>
          {enviando ? 'Guardando...' : unidad ? 'Guardar cambios' : 'Crear unidad'}
        </Button>
      </Inline>
    </Stack>
  );
}
