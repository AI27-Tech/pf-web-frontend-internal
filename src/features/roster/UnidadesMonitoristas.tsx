/*
 * Tarjeta "Unidades de cada Monitorista" de /roster (E8-T21, DEC-140 #1, DEC-142 #2).
 *
 * Lista los Monitoristas activos con sus unidades legibles y permite reemplazar el
 * conjunto con "Editar unidades". La facultad la decide el servidor: un 403 se dice
 * aquí y no cierra la sesión.
 */

import { useState } from 'react';

import { Badge, Button, Card, CardBody, CardHeader, Modal, Table } from '@ai27-tech/ui';
import type { Column } from '@ai27-tech/ui';

import { esProhibido } from '@/lib/api/errors';
import type { UsuarioAdmin } from '@/lib/contracts/alcance';
import type { Unidad } from '@/lib/contracts/unidades';

import { vehiculoLegible } from '../viajes/unidadLegible';
import { mensajeErrorAlcance } from './mensajes';
import { UnidadesMonitoristaForm } from './UnidadesMonitoristaForm';
import { useUnidadesMonitoristas, type MonitoristaConUnidades } from './useUnidadesMonitoristas';

const TEXTO = 'var(--ui-color-text)';
const TEXTO_TENUE = 'var(--ui-color-text-muted)';

/** `nombre` e `identificador_usuario` son opcionales en el contrato. */
function nombreMonitorista(m: UsuarioAdmin): string {
  return m.nombre || m.identificador_usuario || 'Monitorista sin nombre';
}

function UnidadesAsignadas({
  ids,
  porId,
}: {
  readonly ids: readonly string[];
  readonly porId: ReadonlyMap<string, Unidad>;
}) {
  if (ids.length === 0) {
    return <span style={{ color: TEXTO_TENUE }}>Sin unidades</span>;
  }
  return (
    <ul
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--ui-space-2)',
        margin: 0,
        padding: 0,
        listStyle: 'none',
      }}
    >
      {ids.map((id) => {
        const unidad = porId.get(id);
        return (
          <li key={id} style={{ display: 'flex', gap: 'var(--ui-space-1)', alignItems: 'center' }}>
            <span>{unidad ? vehiculoLegible(unidad) : id}</span>
            {unidad && !unidad.activa && <Badge variant="neutral">Inactiva</Badge>}
          </li>
        );
      })}
    </ul>
  );
}

export function UnidadesMonitoristas() {
  const r = useUnidadesMonitoristas();
  const [editando, setEditando] = useState<MonitoristaConUnidades | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const porId = new Map(r.unidades.map((u) => [u.id, u]));

  const abrir = (fila: MonitoristaConUnidades) => {
    r.fijar.reset();
    setAviso(null);
    setEditando(fila);
  };

  const columnas: Column<MonitoristaConUnidades>[] = [
    { key: 'monitorista', header: 'Monitorista', cell: (f) => nombreMonitorista(f.monitorista) },
    {
      key: 'unidades',
      header: 'Unidades asignadas',
      cell: (f) => <UnidadesAsignadas ids={f.unidadesIds} porId={porId} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      cell: (f) => (
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Editar unidades de ${nombreMonitorista(f.monitorista)}`}
          onClick={() => abrir(f)}
        >
          Editar unidades
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card variant="outlined">
        <CardHeader>
          <h2 className="ui-text-body-md" style={{ margin: 0, color: TEXTO }}>
            Unidades de cada Monitorista
          </h2>
        </CardHeader>
        <CardBody>
          {aviso && (
            <p
              role="status"
              className="ui-text-body-sm"
              style={{ margin: '0 0 var(--ui-space-2)', color: 'var(--ui-color-success)' }}
            >
              {aviso}
            </p>
          )}
          {esProhibido(r.error) ? (
            <p role="alert" className="ui-text-body-sm" style={{ margin: 0, color: TEXTO }}>
              No tienes permiso para consultar las unidades de los Monitoristas.
            </p>
          ) : r.error ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-2)' }}>
              <p
                role="alert"
                className="ui-text-body-sm"
                style={{ margin: 0, color: 'var(--ui-color-error)' }}
              >
                No se pudieron cargar las unidades de los Monitoristas.
              </p>
              <Button variant="secondary" onClick={r.reintentar}>
                Reintentar
              </Button>
            </div>
          ) : r.cargando ? (
            <p className="ui-text-body-sm" style={{ margin: 0, color: TEXTO_TENUE }}>
              Cargando los Monitoristas...
            </p>
          ) : (
            <Table<MonitoristaConUnidades>
              columns={columnas}
              data={r.monitoristas}
              rowKey={(f) => f.monitorista.id}
              aria-label="Unidades de cada Monitorista"
              emptyState="No hay Monitoristas activos."
              density="compact"
            />
          )}
        </CardBody>
      </Card>

      <Modal
        open={editando !== null}
        onClose={() => setEditando(null)}
        title={editando ? `Unidades de ${nombreMonitorista(editando.monitorista)}` : ''}
      >
        {editando && (
          <UnidadesMonitoristaForm
            key={editando.monitorista.id}
            actuales={editando.unidadesIds}
            unidades={r.unidades}
            enviando={r.fijar.isPending}
            error={r.fijar.error ? mensajeErrorAlcance(r.fijar.error) : null}
            onCancelar={() => setEditando(null)}
            onGuardar={(unidadesIds) =>
              r.fijar.mutate(
                { sujetoId: editando.monitorista.id, unidadesIds },
                {
                  onSuccess: () => {
                    setEditando(null);
                    setAviso(`Unidades de ${nombreMonitorista(editando.monitorista)} guardadas.`);
                  },
                },
              )
            }
          />
        )}
      </Modal>
    </>
  );
}
