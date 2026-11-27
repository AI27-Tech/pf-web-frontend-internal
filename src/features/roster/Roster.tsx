/*
 * Sección /roster del Jefe Operativo (E8-T21, DEC-142).
 *
 * Entran el Jefe Operativo y el Administrador, los dos con edición completa. Lista
 * el roster por página, da de alta unidades y las edita (vehículo, custodios,
 * activar o desactivar, con el cliente al que sirve) y asigna "mis clientes" a cada
 * Monitorista (DEC-149 #18, tracer.46).
 */

import { useState } from 'react';

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Inline,
  Modal,
  Pagination,
  PageHeader,
  SkeletonText,
  Stack,
  Table,
} from '@ai27-tech/ui';
import type { Column } from '@ai27-tech/ui';

import { BloqueError } from '@/components/feedback/BloqueError';
import { useSession } from '@/context/SessionContext';
import { esProhibido } from '@/lib/api/errors';
import type { Unidad } from '@/lib/contracts/unidades';

import { puedeArmarRoster } from '../catalogos/afordancias';
import { useCustodios, useVehiculos } from '../catalogos/useCatalogos';
import { custodiosLegibles, vehiculoLegible } from '../viajes/unidadLegible';
import { ClientesMonitoristas } from './ClientesMonitoristas';
import { mensajeErrorRoster } from './mensajes';
import { UnidadForm } from './UnidadForm';
import { useClientesActivos } from './useClientesMonitoristas';
import { useRoster } from './useRoster';

/** El `bff` no publica su tamaño de página: solo posiciona el control de páginas. */
const TAMANO_PAGINA = 20;

export function Roster() {
  const { usuario } = useSession();

  if (!puedeArmarRoster(usuario?.rol)) {
    return (
      <Stack gap={4}>
        <PageHeader title="Roster de unidades" />
        <Alert variant="danger">
          No tienes acceso al roster. Esta sección es del Jefe Operativo y del Administrador.
        </Alert>
      </Stack>
    );
  }
  return <RosterAutorizado />;
}

type Edicion =
  { readonly modo: 'alta' } | { readonly modo: 'editar'; readonly unidad: Unidad } | null;

function RosterAutorizado() {
  const r = useRoster();
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Los clientes se piden al cargar: la tabla muestra el nombre del cliente de cada unidad.
  const clientes = useClientesActivos(true);
  // Vehículos y custodios solo se piden al abrir el formulario.
  const vehiculos = useVehiculos(edicion !== null);
  const custodios = useCustodios(edicion !== null);
  const clientesPorId = new Map((clientes.data ?? []).map((c) => [c.id, c]));

  const abrir = (siguiente: Edicion) => {
    r.guardar.reset();
    setAviso(null);
    setEdicion(siguiente);
  };

  const columnas: Column<Unidad>[] = [
    { key: 'vehiculo', header: 'Vehículo', cell: (u) => vehiculoLegible(u) },
    { key: 'custodios', header: 'Custodios', cell: (u) => custodiosLegibles(u) },
    {
      key: 'cliente',
      header: 'Cliente',
      cell: (u) => {
        if (!u.cliente_id) return 'Sin cliente';
        if (clientes.isPending) return '—';
        const cliente = clientesPorId.get(u.cliente_id);
        if (cliente) return cliente.nombre;
        // Un cliente que ya no está activo se muestra por su id, marcado, sin inventar nombre.
        return (
          <Inline gap={1} align="center" wrap={false}>
            <span>{u.cliente_id}</span>
            <Badge variant="neutral">Desactivado</Badge>
          </Inline>
        );
      },
    },
    { key: 'tipo', header: 'Tipo', cell: (u) => (u.tipo === 'moto' ? 'Moto' : 'Patrulla') },
    {
      key: 'activa',
      header: 'Estado',
      cell: (u) => (
        <Badge variant={u.activa ? 'secure' : 'neutral'}>{u.activa ? 'Activa' : 'Inactiva'}</Badge>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      cell: (u) => (
        <a
          href={`#unidad-${u.id}`}
          aria-label={`Editar unidad ${vehiculoLegible(u)}`}
          style={{ color: 'var(--ui-color-primary)', textDecoration: 'underline' }}
          onClick={(evento) => {
            // Con modificador o clic central, el navegador abre la liga en otra pestaña.
            if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey) return;
            evento.preventDefault();
            abrir({ modo: 'editar', unidad: u });
          }}
        >
          Editar
        </a>
      ),
    },
  ];

  return (
    <Stack gap={4}>
      <PageHeader
        title="Roster de unidades"
        description="Unidades de la flota, sus custodios y el cliente al que sirven."
        actions={
          <Button variant="primary" onClick={() => abrir({ modo: 'alta' })}>
            Nueva unidad
          </Button>
        }
      />

      <Card variant="outlined">
        <CardHeader title="Unidades" />
        <CardBody>
          <Stack gap={3}>
            {aviso && <Alert variant="success">{aviso}</Alert>}
            {esProhibido(r.error) ? (
              <Alert variant="danger">No tienes permiso para consultar el roster.</Alert>
            ) : r.error ? (
              <BloqueError mensaje="No se pudo cargar el roster." onReintentar={r.reintentar} />
            ) : (
              <>
                <Table<Unidad>
                  columns={columnas}
                  data={r.unidades}
                  rowKey={(u) => u.id}
                  loading={r.cargando}
                  aria-label="Roster de unidades"
                  emptyState="El roster no tiene unidades."
                  density="compact"
                />
                {(r.hayAnterior || r.haySiguiente) && (
                  <Pagination
                    page={r.numeroPagina}
                    pageSize={TAMANO_PAGINA}
                    total={r.totalEstimado}
                    showInfo={false}
                    onPageChange={r.irAPagina}
                  />
                )}
              </>
            )}
          </Stack>
        </CardBody>
      </Card>

      <ClientesMonitoristas />

      <Modal
        open={edicion !== null}
        onClose={() => setEdicion(null)}
        title={edicion?.modo === 'editar' ? 'Editar unidad' : 'Nueva unidad'}
      >
        {edicion &&
          (vehiculos.isPending || custodios.isPending || clientes.isPending ? (
            <SkeletonText lines={5} />
          ) : vehiculos.error || custodios.error ? (
            <Alert variant="danger">
              {esProhibido(vehiculos.error) || esProhibido(custodios.error)
                ? 'No tienes permiso para consultar vehículos y custodios.'
                : 'No se pudieron cargar los vehículos y custodios.'}
            </Alert>
          ) : (
            <UnidadForm
              key={edicion.modo === 'editar' ? edicion.unidad.id : 'alta'}
              {...(edicion.modo === 'editar' && { unidad: edicion.unidad })}
              vehiculos={vehiculos.data ?? []}
              custodios={custodios.data ?? []}
              clientes={clientes.data ?? []}
              enviando={r.guardar.isPending}
              error={r.guardar.error ? mensajeErrorRoster(r.guardar.error) : null}
              onCancelar={() => setEdicion(null)}
              onGuardar={(datos) =>
                r.guardar.mutate(datos, {
                  onSuccess: () => {
                    setEdicion(null);
                    setAviso('id' in datos ? 'Unidad actualizada.' : 'Unidad creada.');
                  },
                })
              }
            />
          ))}
      </Modal>
    </Stack>
  );
}
