/*
 * Catálogos: vehículos y custodios (adelanto de E8-T16, DEC-142 #6, tracer.39).
 *
 * Leen el Jefe Operativo, el Coordinador y el Administrador (`catalogos.ver`); dan de alta y
 * editan el Coordinador y el Administrador (`catalogos.escribir`). Ocultar los botones es
 * afordancia: la autoridad es el 403 del `bff`, que hoy solo deja escribir al Administrador y
 * aquí se muestra como falta de permiso sin cerrar la sesión (Requirement T2). Los demás
 * catálogos de E8-T16 (tipos, contratos y SLA) siguen pendientes.
 */

import { useState, type ReactNode } from 'react';

import {
  Alert,
  Badge,
  Button,
  Card,
  Modal,
  PageHeader,
  Section,
  Stack,
  Table,
} from '@ai27-tech/ui';
import type { Column } from '@ai27-tech/ui';

import { BloqueError } from '@/components/feedback/BloqueError';
import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { SinPermiso } from '@/components/permisos/SinPermiso';
import { useSession } from '@/context/SessionContext';
import { esProhibido } from '@/lib/api/errors';
import type { Custodio, Vehiculo } from '@/lib/contracts/catalogos';
import { puede } from '@/lib/permisos';

import { CustodioForm } from './CustodioForm';
import { etiquetaVehiculo, mensajeErrorCatalogo } from './mensajes';
import { useCustodios, useGuardarCustodio, useGuardarVehiculo, useVehiculos } from './useCatalogos';
import { VehiculoForm } from './VehiculoForm';

const TEXTO_TENUE = 'var(--ui-color-text-muted)';

export function Catalogos() {
  return (
    <Stack gap={4}>
      <PageHeader title="Catálogos" />
      <RequiereCapacidad capacidad="catalogos.ver">
        <CatalogosAutorizados />
      </RequiereCapacidad>
    </Stack>
  );
}

function CatalogosAutorizados() {
  const { usuario } = useSession();
  const escribe = puede(usuario?.rol, 'catalogos.escribir');

  return (
    <>
      <SeccionVehiculos escribe={escribe} />
      <SeccionCustodios escribe={escribe} />
      <p className="ui-text-body-xs" style={{ margin: 0, color: TEXTO_TENUE }}>
        Los demás catálogos (tipos, contratos y SLA) llegan con E8-T16.
      </p>
    </>
  );
}

type Edicion<T> = { readonly modo: 'alta' } | { readonly modo: 'editar'; readonly valor: T } | null;

function SeccionVehiculos({ escribe }: { readonly escribe: boolean }) {
  const lista = useVehiculos();
  const guardar = useGuardarVehiculo();
  const [edicion, setEdicion] = useState<Edicion<Vehiculo>>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const abrir = (siguiente: Edicion<Vehiculo>) => {
    guardar.reset();
    setAviso(null);
    setEdicion(siguiente);
  };

  const columnas: Column<Vehiculo>[] = [
    { key: 'economico', header: 'Económico', cell: (v) => v.economico ?? '—' },
    { key: 'placas', header: 'Placas', cell: (v) => v.placas ?? '—' },
    { key: 'tipo', header: 'Tipo', cell: (v) => (v.tipo === 'moto' ? 'Moto' : 'Coche') },
    {
      key: 'estado',
      header: 'Estado',
      cell: (v) => <Estado activo={v.estado === 'activa'} genero="a" />,
    },
    ...(escribe
      ? [
          {
            key: 'acciones',
            header: 'Acciones',
            cell: (v: Vehiculo) => (
              <Button
                variant="secondary"
                size="sm"
                aria-label={`Editar vehículo ${etiquetaVehiculo(v)}`}
                onClick={() => abrir({ modo: 'editar', valor: v })}
              >
                Editar
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card variant="outlined">
      <Section
        title={
          <span role="heading" aria-level={2}>
            Vehículos
          </span>
        }
        actions={
          escribe && (
            <Button variant="primary" onClick={() => abrir({ modo: 'alta' })}>
              Nuevo vehículo
            </Button>
          )
        }
      >
        {aviso && <Confirmacion texto={aviso} />}
        <ContenidoLista
          cargando={lista.isPending}
          error={lista.error}
          recurso="vehículos"
          onReintentar={() => void lista.refetch()}
        >
          <Table<Vehiculo>
            columns={columnas}
            data={lista.data ?? []}
            rowKey={(v) => v.id}
            aria-label="Vehículos"
            emptyState="No hay vehículos registrados."
            density="compact"
          />
        </ContenidoLista>
      </Section>
      <Modal
        open={edicion !== null}
        onClose={() => setEdicion(null)}
        title={edicion?.modo === 'editar' ? 'Editar vehículo' : 'Nuevo vehículo'}
      >
        {edicion && (
          <VehiculoForm
            key={edicion.modo === 'editar' ? edicion.valor.id : 'alta'}
            {...(edicion.modo === 'editar' && { vehiculo: edicion.valor })}
            enviando={guardar.isPending}
            error={guardar.error ? mensajeErrorCatalogo(guardar.error, 'vehiculo') : null}
            onCancelar={() => setEdicion(null)}
            onGuardar={(datos) =>
              guardar.mutate(datos, {
                onSuccess: () => {
                  setEdicion(null);
                  setAviso('id' in datos ? 'Vehículo actualizado.' : 'Vehículo creado.');
                },
              })
            }
          />
        )}
      </Modal>
    </Card>
  );
}

function SeccionCustodios({ escribe }: { readonly escribe: boolean }) {
  const lista = useCustodios();
  const guardar = useGuardarCustodio();
  const [edicion, setEdicion] = useState<Edicion<Custodio>>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const abrir = (siguiente: Edicion<Custodio>) => {
    guardar.reset();
    setAviso(null);
    setEdicion(siguiente);
  };

  const columnas: Column<Custodio>[] = [
    { key: 'nombre', header: 'Nombre', accessor: 'nombre' },
    { key: 'telefono', header: 'Teléfono', cell: (c) => c.telefono ?? '—' },
    {
      key: 'estado',
      header: 'Estado',
      cell: (c) => <Estado activo={c.estado === 'activo'} genero="o" />,
    },
    ...(escribe
      ? [
          {
            key: 'acciones',
            header: 'Acciones',
            cell: (c: Custodio) => (
              <Button
                variant="secondary"
                size="sm"
                aria-label={`Editar custodio ${c.nombre}`}
                onClick={() => abrir({ modo: 'editar', valor: c })}
              >
                Editar
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card variant="outlined">
      <Section
        title={
          <span role="heading" aria-level={2}>
            Custodios
          </span>
        }
        actions={
          escribe && (
            <Button variant="primary" onClick={() => abrir({ modo: 'alta' })}>
              Nuevo custodio
            </Button>
          )
        }
      >
        {aviso && <Confirmacion texto={aviso} />}
        <ContenidoLista
          cargando={lista.isPending}
          error={lista.error}
          recurso="custodios"
          onReintentar={() => void lista.refetch()}
        >
          <Table<Custodio>
            columns={columnas}
            data={lista.data ?? []}
            rowKey={(c) => c.id}
            aria-label="Custodios"
            emptyState="No hay custodios registrados."
            density="compact"
          />
        </ContenidoLista>
      </Section>
      <Modal
        open={edicion !== null}
        onClose={() => setEdicion(null)}
        title={edicion?.modo === 'editar' ? 'Editar custodio' : 'Nuevo custodio'}
      >
        {edicion && (
          <CustodioForm
            key={edicion.modo === 'editar' ? edicion.valor.id : 'alta'}
            {...(edicion.modo === 'editar' && { custodio: edicion.valor })}
            enviando={guardar.isPending}
            error={guardar.error ? mensajeErrorCatalogo(guardar.error, 'custodio') : null}
            onCancelar={() => setEdicion(null)}
            onGuardar={(datos) =>
              guardar.mutate(datos, {
                onSuccess: () => {
                  setEdicion(null);
                  setAviso('id' in datos ? 'Custodio actualizado.' : 'Custodio creado.');
                },
              })
            }
          />
        )}
      </Modal>
    </Card>
  );
}

function ContenidoLista({
  cargando,
  error,
  recurso,
  onReintentar,
  children,
}: {
  readonly cargando: boolean;
  readonly error: Error | null;
  readonly recurso: string;
  readonly onReintentar: () => void;
  readonly children: ReactNode;
}) {
  if (esProhibido(error)) {
    return <SinPermiso descripcion={`No tienes permiso para consultar los ${recurso}.`} />;
  }
  if (error) {
    return (
      <BloqueError mensaje={`No se pudieron cargar los ${recurso}.`} onReintentar={onReintentar} />
    );
  }
  if (cargando) {
    return (
      <p className="ui-text-body-sm" style={{ margin: 0, color: TEXTO_TENUE }}>
        Cargando {recurso}...
      </p>
    );
  }
  return <>{children}</>;
}

function Estado({ activo, genero }: { readonly activo: boolean; readonly genero: 'a' | 'o' }) {
  return (
    <Badge variant={activo ? 'secure' : 'neutral'}>
      {activo ? `Activ${genero}` : `Inactiv${genero}`}
    </Badge>
  );
}

function Confirmacion({ texto }: { readonly texto: string }) {
  return <Alert variant="success">{texto}</Alert>;
}
