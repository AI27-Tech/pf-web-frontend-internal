/*
 * Formulario de selección de la escolta (E8-T10).
 *
 * La unidad se elige completa: vehículo y custodios ya vienen empaquetados en
 * el roster. La lista muestra SOLO las unidades `activa` (el contrato describe
 * `activa` como "disponible para asignarse", así que una inactiva no es
 * asignable y no se ofrece). La aptitud detallada no forma parte del contrato
 * del roster y no gatea (DEC-055). Comportamiento conservador a falta de una
 * regla de negocio publicada sobre el listado de inactivas (pendiente de
 * confirmar con Operación: si debe ocultarlas aquí, filtrarlas en el `bff`, o
 * rechazarlas al asignar). Solo compone componentes publicados por @ai27-tech/ui.
 */

import { useState } from 'react';

import { Button, Card, CardBody, CardFooter, Form, Table } from '@ai27-tech/ui';
import type { Column } from '@ai27-tech/ui';

import type { Unidad } from '@/lib/contracts/unidades';

export interface AsignacionFormProps {
  readonly unidades: Unidad[];
  readonly cargando: boolean;
  readonly error: Error | null;
  readonly enviando: boolean;
  readonly onConfirm: (unidades_ids: string[]) => Promise<void>;
  readonly onCancel: () => void;
  readonly onReintentar: () => void;
}

const columnas: Column<Unidad>[] = [
  {
    key: 'vehiculo_id',
    header: 'Vehículo',
    cell: (unidad) => unidad.vehiculo_id,
  },
  {
    key: 'custodios_ids',
    header: 'Custodios',
    cell: (unidad) => unidad.custodios_ids.join(', '),
  },
  {
    key: 'tipo',
    header: 'Tipo',
    accessor: 'tipo',
  },
];

/** Selecciona una o más unidades y confirma la asignación atómica. */
export function AsignacionForm({
  unidades,
  cargando,
  error,
  enviando,
  onConfirm,
  onCancel,
  onReintentar,
}: AsignacionFormProps) {
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  // El roster de asignación solo ofrece unidades `activa` (disponibles para
  // asignarse). Las inactivas no se muestran. Si no queda ninguna activa, se
  // cae al estado "sin unidades disponibles".
  const unidadesAsignables = unidades.filter((unidad) => unidad.activa);

  const handleConfirm = async () => {
    if (seleccionadas.size === 0) {
      setErrorEnvio('Selecciona al menos una unidad para asignar.');
      return;
    }

    try {
      setErrorEnvio(null);
      await onConfirm([...seleccionadas]);
    } catch (submissionError) {
      setErrorEnvio(
        submissionError instanceof Error
          ? submissionError.message
          : 'No se pudo asignar la escolta. Por favor, reintenta.',
      );
    }
  };

  if (cargando) {
    return (
      <Card>
        <CardBody>
          <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
            Cargando unidades del roster...
          </p>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="outlined">
        <CardBody>
          <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
            No se pudo cargar el roster de unidades.
          </p>
        </CardBody>
        <CardFooter>
          <Button variant="secondary" onClick={onReintentar}>
            Reintentar
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const sinUnidades = unidadesAsignables.length === 0;
  const bloqueado = enviando || sinUnidades || seleccionadas.size === 0;

  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        void handleConfirm();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-3)' }}
    >
      {sinUnidades ? (
        <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
          Sin unidades disponibles para asignar.
        </p>
      ) : (
        <Table<Unidad>
          columns={columnas}
          data={unidadesAsignables}
          rowKey={(unidad) => unidad.id}
          selectedKeys={seleccionadas}
          onSelectionChange={(keys) => setSeleccionadas(new Set([...keys].map(String)))}
          aria-label="Unidades del roster"
          emptyState="Sin unidades disponibles para asignar."
          density="compact"
        />
      )}

      {errorEnvio && (
        <p
          className="ui-text-body-xs"
          style={{ color: 'var(--ui-color-error)', margin: 0 }}
          role="alert"
        >
          {errorEnvio}
        </p>
      )}

      <div style={{ display: 'flex', gap: 'var(--ui-space-2)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} disabled={enviando} type="button">
          Cancelar
        </Button>
        <Button variant="primary" disabled={bloqueado} type="submit">
          {enviando ? 'Asignando...' : 'Confirmar asignación'}
        </Button>
      </div>
    </Form>
  );
}
