/*
 * Catálogos: vehículos y custodios (adelanto de E8-T16, DEC-142 #6, tracer.39).
 *
 * Leen el Jefe Operativo y el Administrador; dan de alta y editan solo el
 * Administrador. Ocultar los botones es afordancia: la autoridad es el 403 del
 * `bff`, que aquí se muestra como falta de permiso sin cerrar la sesión. Los demás
 * catálogos de E8-T16 (tipos, contratos y SLA) siguen pendientes.
 */

import { useState, type ReactNode } from 'react';

import { Alert, Badge, Button, Card, CardBody, CardHeader, Modal, Table } from '@ai27-tech/ui';
import type { Column } from '@ai27-tech/ui';

import { BloqueError } from '@/components/feedback/BloqueError';
import { useSession } from '@/context/SessionContext';
import { esProhibido } from '@/lib/api/errors';
import type { Custodio, Vehiculo } from '@/lib/contracts/catalogos';

import { puedeArmarRoster, puedeEscribirCatalogos } from './afordancias';
import { CustodioForm } from './CustodioForm';
import { etiquetaVehiculo, mensajeErrorCatalogo } from './mensajes';
import { useCustodios, useGuardarCustodio, useGuardarVehiculo, useVehiculos } from './useCatalogos';
import { VehiculoForm } from './VehiculoForm';

const TEXTO = 'var(--ui-color-text)';
const TEXTO_TENUE = 'var(--ui-color-text-muted)';

export function Catalogos() {
  const { usuario } = useSession();
  const rol = usuario?.rol;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4)' }}>
      <h1 className="ui-text-headline-lg" style={{ margin: 0, color: TEXTO }}>
        Catálogos
      </h1>
      {puedeArmarRoster(rol) ? (
        <>
          <SeccionVehiculos escribe={puedeEscribirCatalogos(rol)} />
          <SeccionCustodios escribe={puedeEscribirCatalogos(rol)} />
        </>
      ) : (
        <Aviso>
          Vehículos y custodios solo están disponibles para el Jefe Operativo y el Administrador.
        </Aviso>
      )}
      <p className="ui-text-body-xs" style={{ margin: 0, color: TEXTO_TENUE }}>
        Los demás catálogos (tipos, contratos y SLA) llegan con E8-T16.
      </p>
    </div>
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
      <CardHeader>
        <Encabezado titulo="Vehículos">
          {escribe && (
            <Button variant="primary" onClick={() => abrir({ modo: 'alta' })}>
              Nuevo vehículo
            </Button>
          )}
        </Encabezado>
      </CardHeader>
      <CardBody>
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
      </CardBody>
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
      <CardHeader>
        <Encabezado titulo="Custodios">
          {escribe && (
            <Button variant="primary" onClick={() => abrir({ modo: 'alta' })}>
              Nuevo custodio
            </Button>
          )}
        </Encabezado>
      </CardHeader>
      <CardBody>
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
      </CardBody>
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

function Encabezado({
  titulo,
  children,
}: {
  readonly titulo: string;
  readonly children?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h2 className="ui-text-body-md" style={{ margin: 0, color: TEXTO }}>
        {titulo}
      </h2>
      {children}
    </div>
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
    return <Aviso>No tienes permiso para consultar los {recurso}.</Aviso>;
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

function Aviso({ children }: { readonly children: ReactNode }) {
  return <Alert variant="danger">{children}</Alert>;
}

function Confirmacion({ texto }: { readonly texto: string }) {
  return <Alert variant="success">{texto}</Alert>;
}
