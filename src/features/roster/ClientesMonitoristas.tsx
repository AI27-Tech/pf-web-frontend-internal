/*
 * Tarjeta "Clientes de cada Monitorista" de /roster (DEC-149 #18, M11).
 *
 * Lista los Monitoristas activos con sus clientes y permite reemplazar el conjunto con
 * "Editar clientes". La facultad la decide el servidor: un 403 se dice aquí y no cierra la
 * sesión. El nombre del cliente sale del catálogo de activos; un cliente asignado que no está
 * ahí se muestra por su id con la marca "desactivado" y no se inventa su nombre.
 */
import { useState } from 'react';
import { Alert, Badge, Button, Card, Inline, Modal, Section, Table } from '@ai27-tech/ui';
import type { Column } from '@ai27-tech/ui';
import { BloqueError } from '@/components/feedback/BloqueError';
import { esProhibido } from '@/lib/api/errors';
import type { UsuarioAdmin } from '@/lib/contracts/alcance';
import type { Cliente } from '@/lib/contracts/clientes';
import { ClientesMonitoristaForm } from './ClientesMonitoristaForm';
import { mensajeErrorAlcance } from './mensajes';
import { useClientesMonitoristas, type MonitoristaConClientes } from './useClientesMonitoristas';

const TEXTO_TENUE = 'var(--ui-color-text-muted)';

/** `nombre` e `identificador_usuario` son opcionales en el contrato. */
function nombreMonitorista(m: UsuarioAdmin): string {
  return m.nombre || m.identificador_usuario || 'Monitorista sin nombre';
}

function ClientesAsignados({
  ids,
  porId,
}: {
  readonly ids: readonly string[];
  readonly porId: ReadonlyMap<string, Cliente>;
}) {
  if (ids.length === 0) {
    return <span style={{ color: TEXTO_TENUE }}>Sin clientes</span>;
  }
  return (
    <Inline
      as="ul"
      gap={2}
      align="stretch"
      wrap
      style={{ margin: 0, padding: 0, listStyle: 'none' }}
    >
      {ids.map((id) => {
        const cliente = porId.get(id);
        return (
          <Inline as="li" key={id} gap={1} align="center" wrap={false}>
            <span>{cliente ? cliente.nombre : id}</span>
            {!cliente && <Badge variant="neutral">Desactivado</Badge>}
          </Inline>
        );
      })}
    </Inline>
  );
}

export function ClientesMonitoristas() {
  const r = useClientesMonitoristas();
  const [editando, setEditando] = useState<MonitoristaConClientes | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const porId = new Map(r.clientes.map((c) => [c.id, c]));

  const abrir = (fila: MonitoristaConClientes) => {
    r.fijar.reset();
    setAviso(null);
    setEditando(fila);
  };

  const columnas: Column<MonitoristaConClientes>[] = [
    { key: 'monitorista', header: 'Monitorista', cell: (f) => nombreMonitorista(f.monitorista) },
    {
      key: 'clientes',
      header: 'Clientes asignados',
      cell: (f) => <ClientesAsignados ids={f.clientesIds} porId={porId} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      cell: (f) => (
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Editar clientes de ${nombreMonitorista(f.monitorista)}`}
          onClick={() => abrir(f)}
        >
          Editar clientes
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card variant="outlined">
        <Section
          title={
            <span role="heading" aria-level={2}>
              Clientes de cada Monitorista
            </span>
          }
        >
          {aviso && (
            <Alert variant="success" style={{ marginBottom: 'var(--ui-space-2)' }}>
              {aviso}
            </Alert>
          )}
          {esProhibido(r.error) ? (
            <Alert variant="danger">
              No tienes permiso para consultar los clientes de los Monitoristas.
            </Alert>
          ) : r.error ? (
            <BloqueError
              mensaje="No se pudieron cargar los clientes de los Monitoristas."
              onReintentar={r.reintentar}
            />
          ) : r.cargando ? (
            <p className="ui-text-body-sm" style={{ margin: 0, color: TEXTO_TENUE }}>
              Cargando los Monitoristas...
            </p>
          ) : (
            <Table<MonitoristaConClientes>
              columns={columnas}
              data={r.monitoristas}
              rowKey={(f) => f.monitorista.id}
              aria-label="Clientes de cada Monitorista"
              emptyState="No hay Monitoristas activos."
              density="compact"
            />
          )}
        </Section>
      </Card>
      <Modal
        open={editando !== null}
        onClose={() => setEditando(null)}
        title={editando ? `Clientes de ${nombreMonitorista(editando.monitorista)}` : ''}
      >
        {editando && (
          <ClientesMonitoristaForm
            key={editando.monitorista.id}
            actuales={editando.clientesIds}
            clientes={r.clientes}
            enviando={r.fijar.isPending}
            error={r.fijar.error ? mensajeErrorAlcance(r.fijar.error) : null}
            onCancelar={() => setEditando(null)}
            onGuardar={(clientesIds) =>
              r.fijar.mutate(
                { sujetoId: editando.monitorista.id, clientesIds },
                {
                  onSuccess: () => {
                    setEditando(null);
                    setAviso(`Clientes de ${nombreMonitorista(editando.monitorista)} guardados.`);
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
