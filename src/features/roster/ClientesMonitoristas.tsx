/*
 * Tarjeta "Clientes de cada Monitorista" de /roster (DEC-149 #18, M11).
 *
 * Lista los Monitoristas activos con sus clientes y permite reemplazar el conjunto con
 * "Editar clientes". La facultad la decide el servidor: un 403 se dice aquí y no cierra la
 * sesión. El nombre del cliente sale del catálogo de activos; un cliente asignado que no está
 * ahí se muestra por su id con la marca "desactivado" y no se inventa su nombre.
 */
import { useState } from 'react';
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Inline,
  Modal,
  Stack,
  Table,
} from '@ai27-tech/ui';
import type { Column } from '@ai27-tech/ui';
import { BloqueError } from '@/components/feedback/BloqueError';
import { esProhibido } from '@/lib/api/errors';
import type { UsuarioAdmin } from '@/lib/contracts/alcance';
import type { Cliente } from '@/lib/contracts/clientes';
import { ClientesMonitoristaForm } from './ClientesMonitoristaForm';
import { mensajeErrorAlcance } from './mensajes';
import { useClientesMonitoristas, type MonitoristaConClientes } from './useClientesMonitoristas';

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
    return <Badge variant="neutral">Sin clientes</Badge>;
  }
  return (
    <Inline
      as="ul"
      gap={2}
      align="stretch"
      wrap
      // El `ul` no lleva viñetas: la lista se lee como etiquetas en una fila.
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
        <a
          href={`#monitorista-${f.monitorista.id}`}
          aria-label={`Editar clientes de ${nombreMonitorista(f.monitorista)}`}
          style={{ color: 'var(--ui-color-primary)', textDecoration: 'underline' }}
          onClick={(evento) => {
            // Con modificador o clic central, el navegador abre la liga en otra pestaña.
            if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey) return;
            evento.preventDefault();
            abrir(f);
          }}
        >
          Editar clientes
        </a>
      ),
    },
  ];

  return (
    <>
      <Card variant="outlined">
        <CardHeader title="Clientes de cada Monitorista" />
        <CardBody>
          <Stack gap={3}>
            {aviso && <Alert variant="success">{aviso}</Alert>}
            {esProhibido(r.error) ? (
              <Alert variant="danger">
                No tienes permiso para consultar los clientes de los Monitoristas.
              </Alert>
            ) : r.error ? (
              <BloqueError
                mensaje="No se pudieron cargar los clientes de los Monitoristas."
                onReintentar={r.reintentar}
              />
            ) : (
              <Table<MonitoristaConClientes>
                columns={columnas}
                data={r.monitoristas}
                rowKey={(f) => f.monitorista.id}
                loading={r.cargando}
                aria-label="Clientes de cada Monitorista"
                emptyState="No hay Monitoristas activos."
                density="compact"
              />
            )}
          </Stack>
        </CardBody>
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
