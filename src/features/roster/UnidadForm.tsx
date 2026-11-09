/*
 * Alta y edición de una unidad del roster (E8-T21, DEC-142).
 *
 * Se elige un vehículo activo y uno o dos custodios activos; una moto lleva uno.
 * Esa es solo la guía de captura: el `tipo` no se captura (lo deriva el servidor) y
 * la exclusividad, la reserva vigente y la validación final las decide `operacion`.
 * La edición agrega activar o desactivar y envía solo lo que cambió.
 */

import { useState } from 'react';

import { Button, Checkbox, Form, FormField, Select, Switch } from '@ai27-tech/ui';

import type { Custodio, Vehiculo } from '@/lib/contracts/catalogos';
import type { Unidad, UnidadModificacion } from '@/lib/contracts/unidades';

import { etiquetaVehiculo } from '../catalogos/mensajes';
import type { GuardadoUnidad } from './useRoster';

export interface UnidadFormProps {
  /** Unidad a editar; sin ella, el formulario es de alta. */
  readonly unidad?: Unidad;
  readonly vehiculos: readonly Vehiculo[];
  readonly custodios: readonly Custodio[];
  readonly enviando: boolean;
  readonly error: string | null;
  readonly onGuardar: (datos: GuardadoUnidad) => void;
  readonly onCancelar: () => void;
}

function mismosIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export function UnidadForm({
  unidad,
  vehiculos,
  custodios,
  enviando,
  error,
  onGuardar,
  onCancelar,
}: UnidadFormProps) {
  const [vehiculoId, setVehiculoId] = useState(unidad?.vehiculo_id ?? '');
  const [custodiosIds, setCustodiosIds] = useState<readonly string[]>(unidad?.custodios_ids ?? []);
  const [activa, setActiva] = useState(unidad?.activa ?? true);

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
        : { entrada: { vehiculo_id: vehiculoId, custodios_ids: [...custodiosIds] } },
    );
  };

  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        enviar();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-3)' }}
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
          <p className="ui-text-body-sm" style={{ margin: 0 }}>
            No hay custodios activos.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-1)' }}>
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
          </div>
        )}
        {excedido && (
          <p
            role="alert"
            className="ui-text-body-xs"
            style={{ margin: 0, color: 'var(--ui-color-error)' }}
          >
            Una moto lleva un solo custodio. Quita uno.
          </p>
        )}
      </fieldset>

      {unidad && (
        <Switch
          label="Unidad activa"
          checked={activa}
          disabled={enviando}
          onChange={(event) => setActiva(event.target.checked)}
        />
      )}

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
          {enviando ? 'Guardando...' : unidad ? 'Guardar cambios' : 'Crear unidad'}
        </Button>
      </div>
    </Form>
  );
}
