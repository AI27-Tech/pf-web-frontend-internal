/*
 * Sección /roster del Jefe Operativo (E8-T21, DEC-142).
 *
 * Entran el Jefe Operativo y el Administrador, los dos con edición completa. Lista
 * el roster por página, da de alta unidades y las edita (vehículo, custodios,
 * activar o desactivar) y asigna "mis unidades" a cada Monitorista (DEC-140 #1,
 * DEC-142 #2, tracer.40).
 */

import { useState } from 'react';

import { Alert, Badge, Button, Card, CardBody, CardHeader, Modal, Table } from '@ai27-tech/ui';
import type { Column } from '@ai27-tech/ui';

import { BloqueError } from '@/components/feedback/BloqueError';
import { useSession } from '@/context/SessionContext';
import { esProhibido } from '@/lib/api/errors';
import type { Unidad } from '@/lib/contracts/unidades';

import { puedeArmarRoster } from '../catalogos/afordancias';
import { useCustodios, useVehiculos } from '../catalogos/useCatalogos';
import { custodiosLegibles, vehiculoLegible } from '../viajes/unidadLegible';
import { mensajeErrorRoster } from './mensajes';
import { UnidadForm } from './UnidadForm';
import { UnidadesMonitoristas } from './UnidadesMonitoristas';
import { useRoster } from './useRoster';

const TEXTO = 'var(--ui-color-text)';
const TEXTO_TENUE = 'var(--ui-color-text-muted)';

export function Roster() {
  const { usuario } = useSession();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4)' }}>
      <h1 className="ui-text-headline-lg" style={{ margin: 0, color: TEXTO }}>
        Roster de unidades
      </h1>
      {puedeArmarRoster(usuario?.rol) ? (
        <RosterAutorizado />
      ) : (
        <Card variant="outlined">
          <CardBody>
            <Alert variant="danger">
              No tienes acceso al roster. Esta sección es del Jefe Operativo y del Administrador.
            </Alert>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

type Edicion =
  { readonly modo: 'alta' } | { readonly modo: 'editar'; readonly unidad: Unidad } | null;

function RosterAutorizado() {
  const r = useRoster();
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Los selectores del formulario solo se piden al abrirlo.
  const vehiculos = useVehiculos(edicion !== null);
  const custodios = useCustodios(edicion !== null);

  const abrir = (siguiente: Edicion) => {
    r.guardar.reset();
    setAviso(null);
    setEdicion(siguiente);
  };

  const columnas: Column<Unidad>[] = [
    { key: 'vehiculo', header: 'Vehículo', cell: (u) => vehiculoLegible(u) },
    { key: 'custodios', header: 'Custodios', cell: (u) => custodiosLegibles(u) },
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
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Editar unidad ${vehiculoLegible(u)}`}
          onClick={() => abrir({ modo: 'editar', unidad: u })}
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card variant="outlined">
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="ui-text-body-md" style={{ margin: 0, color: TEXTO }}>
              Unidades
            </h2>
            <Button variant="primary" onClick={() => abrir({ modo: 'alta' })}>
              Nueva unidad
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {aviso && (
            <Alert variant="success" style={{ marginBottom: 'var(--ui-space-2)' }}>
              {aviso}
            </Alert>
          )}
          {esProhibido(r.error) ? (
            <Alert variant="danger">No tienes permiso para consultar el roster.</Alert>
          ) : r.error ? (
            <BloqueError mensaje="No se pudo cargar el roster." onReintentar={r.reintentar} />
          ) : r.cargando ? (
            <p className="ui-text-body-sm" style={{ margin: 0, color: TEXTO_TENUE }}>
              Cargando el roster...
            </p>
          ) : (
            <>
              <Table<Unidad>
                columns={columnas}
                data={r.unidades}
                rowKey={(u) => u.id}
                aria-label="Roster de unidades"
                emptyState="El roster no tiene unidades."
                density="compact"
              />
              {(r.hayAnterior || r.haySiguiente) && (
                <nav
                  aria-label="Páginas del roster"
                  style={{
                    display: 'flex',
                    gap: 'var(--ui-space-2)',
                    alignItems: 'center',
                    marginTop: 'var(--ui-space-2)',
                  }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!r.hayAnterior}
                    onClick={r.anterior}
                  >
                    Página anterior
                  </Button>
                  <span className="ui-text-body-sm">Página {r.numeroPagina}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!r.haySiguiente}
                    onClick={r.siguiente}
                  >
                    Página siguiente
                  </Button>
                </nav>
              )}
            </>
          )}
        </CardBody>
      </Card>

      <UnidadesMonitoristas />

      <Modal
        open={edicion !== null}
        onClose={() => setEdicion(null)}
        title={edicion?.modo === 'editar' ? 'Editar unidad' : 'Nueva unidad'}
      >
        {edicion &&
          (vehiculos.isPending || custodios.isPending ? (
            <p className="ui-text-body-sm" style={{ margin: 0 }}>
              Cargando vehículos y custodios...
            </p>
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
    </>
  );
}
