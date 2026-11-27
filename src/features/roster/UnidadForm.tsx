/*
 * Alta y edición de una unidad del roster (E8-T21, DEC-142).
 *
 * Se elige un vehículo activo y uno o dos custodios activos; una moto lleva uno.
 * Esa es solo la guía de captura: el `tipo` no se captura (lo deriva el servidor) y
 * la exclusividad, la reserva vigente y la validación final las decide `operacion`.
 * La edición agrega activar o desactivar y envía solo lo que cambió.
 *
 * Los custodios se buscan en un selector y se agregan; cada elegido aparece como botón que se
 * quita con un clic. Así la lista no crece con el catálogo. Los errores de captura aparecen en
 * su campo tras intentar guardar, y el motivo por el que el botón está deshabilitado se dice
 * junto a él.
 */

import { useState } from 'react';
import { X } from 'lucide-react';

import {
  Alert,
  Button,
  Form,
  FormActions,
  FormField,
  FormSection,
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

const TEXTO_TENUE = 'var(--ui-color-text-muted)';

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
  // Los errores de campo aparecen tras el primer intento de guardar, no antes.
  const [intentado, setIntentado] = useState(false);
  const [avisoCustodios, setAvisoCustodios] = useState<string | null>(null);

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
  // Sin vehículo no hay límite todavía: el custodio se elige después del vehículo.
  const maximo = vehiculo ? (vehiculo.tipo === 'moto' ? 1 : 2) : 0;

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

  const faltaVehiculo = vehiculoId === '';
  const faltaCustodio = custodiosIds.length === 0;
  // Un solo motivo, el primero que aplique: es el que se dice junto al botón.
  const motivoBloqueo: string | null = faltaVehiculo
    ? 'Elige un vehículo.'
    : faltaCustodio
      ? 'Elige al menos un custodio.'
      : sinCambios
        ? 'No hay cambios por guardar.'
        : null;
  const bloqueado = enviando || motivoBloqueo !== null;

  const nombreCustodio = (id: string) => custodios.find((c) => c.id === id)?.nombre ?? id;

  /**
   * Agrega un custodio desde el selector. Con una moto, elegir otro reemplaza al anterior; con un
   * coche se aceptan hasta dos y un tercero se rechaza con aviso.
   */
  const agregarCustodio = (id: string) => {
    if (enviando || faltaVehiculo || id === '' || custodiosIds.includes(id)) return;
    setAvisoCustodios(null);
    if (custodiosIds.length < maximo) {
      setCustodiosIds((actual) => [...actual, id]);
      return;
    }
    if (maximo === 1) {
      setCustodiosIds([id]);
      return;
    }
    setAvisoCustodios(`Un coche lleva hasta ${maximo}. Quita uno antes de elegir otro.`);
  };

  const quitarCustodio = (id: string) => {
    if (enviando) return;
    setAvisoCustodios(null);
    setCustodiosIds((actual) => actual.filter((c) => c !== id));
  };

  // Cambiar de vehículo recorta la selección al nuevo máximo: nunca queda un exceso.
  const cambiarVehiculo = (id: string) => {
    const nuevo = vehiculos.find((v) => v.id === id);
    const nuevoMaximo = nuevo ? (nuevo.tipo === 'moto' ? 1 : 2) : 0;
    setVehiculoId(id);
    setCustodiosIds((actual) => actual.slice(0, nuevoMaximo));
    setAvisoCustodios(null);
  };

  // Solo se ofrecen los custodios que aún no están elegidos.
  const opcionesCustodios = custodiosOfrecidos
    .filter((c) => !custodiosIds.includes(c.id))
    .map((c) => ({ value: c.id, label: c.nombre }));

  const etiquetaEnvio = unidad ? 'Guardar cambios' : 'Crear unidad';

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
        setIntentado(true);
        enviar();
      }}
    >
      <FormField
        label="Vehículo"
        required
        error={intentado && faltaVehiculo ? 'Elige un vehículo.' : undefined}
      >
        <Select
          variant="searchable"
          placeholder="Elige un vehículo"
          value={vehiculoId}
          disabled={enviando}
          options={vehiculosOfrecidos.map((v) => ({
            value: v.id,
            label: `${etiquetaVehiculo(v)} (${v.tipo === 'moto' ? 'moto' : 'coche'})`,
          }))}
          onChange={(valor) => cambiarVehiculo(String(valor))}
        />
      </FormField>

      <FormSection
        title="Custodios"
        description={
          faltaVehiculo
            ? 'Elige primero un vehículo: su tipo define cuántos custodios lleva.'
            : `${custodiosIds.length} de ${maximo} seleccionado${maximo > 1 ? 's' : ''}.`
        }
      >
        {!faltaVehiculo && (
          <Stack gap={2}>
            <FormField label="Agregar custodio">
              <Select
                variant="searchable"
                placeholder="Busca un custodio"
                searchPlaceholder="Buscar por nombre"
                noResultsText="Ningún custodio coincide"
                value=""
                disabled={enviando}
                options={opcionesCustodios}
                onChange={(valor) => agregarCustodio(String(valor))}
              />
            </FormField>
            {faltaCustodio ? (
              <span className="ui-text-body-xs" style={{ color: TEXTO_TENUE }}>
                Ningún custodio elegido.
              </span>
            ) : (
              <Inline gap={2} wrap role="group" aria-label="Custodios elegidos">
                {custodiosIds.map((id) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant="primary"
                    endIcon={<X size={14} aria-hidden="true" />}
                    aria-label={`Quitar a ${nombreCustodio(id)}`}
                    disabled={enviando}
                    onClick={() => quitarCustodio(id)}
                  >
                    {nombreCustodio(id)}
                  </Button>
                ))}
              </Inline>
            )}
          </Stack>
        )}
        {avisoCustodios && <Alert variant="warning">{avisoCustodios}</Alert>}
        {intentado && faltaCustodio && !faltaVehiculo && (
          <Alert variant="danger">Elige al menos un custodio.</Alert>
        )}
      </FormSection>

      <FormField
        label="Cliente al que sirve"
        showOptional
        helpText="Informativo: no define qué clientes ve cada Monitorista."
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

      {motivoBloqueo !== null && !enviando && (
        <p className="ui-text-body-xs" style={{ margin: 0, color: TEXTO_TENUE }}>
          {motivoBloqueo}
        </p>
      )}

      <FormActions align="end" sticky>
        <Button variant="secondary" type="button" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={bloqueado} loading={enviando}>
          {etiquetaEnvio}
        </Button>
      </FormActions>
    </Stack>
  );
}
