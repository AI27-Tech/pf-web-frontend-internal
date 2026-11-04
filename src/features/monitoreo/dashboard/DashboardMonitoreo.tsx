/*
 * Dashboard de monitoreo (E8-T17, Bloque B). Solo viajes y estatus en V1 (DT-09; incidencias
 * y alertas quedan fuera). Los rótulos son de trabajo, pendientes de aprobación de Producto.
 */

import type { ReactNode } from 'react';

import { Button, Card, CardBody, CardHeader, Table } from '@ai27-tech/ui';

import { useSession } from '@/context/SessionContext';
import { puedeUsarMonitoreo } from '@/features/monitoreo/puedeUsarMonitoreo';
import type { FilaViaje } from '@/lib/contracts/reportes';

import { conteosEnCurso } from './conteos';
import { IndicadorFrescura } from './IndicadorFrescura';
import { useDashboardMonitoreo, type VistaSeleccionable } from './useDashboardMonitoreo';

const ETIQUETA_VISTA: Record<VistaSeleccionable, string> = {
  en_curso: 'En curso',
  rango: 'Últimos 7 días',
};

export function DashboardMonitoreo() {
  const { usuario } = useSession();

  if (!usuario || !puedeUsarMonitoreo(usuario.rol)) {
    return <Mensaje>Este dashboard no está disponible para tu rol.</Mensaje>;
  }

  return <DashboardAutorizado />;
}

function DashboardAutorizado() {
  const d = useDashboardMonitoreo();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4)' }}>
      <h1 className="ui-text-headline-lg" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
        Dashboard de monitoreo
      </h1>

      <div style={{ display: 'flex', gap: 'var(--ui-space-2)' }} role="group" aria-label="Vista">
        {(Object.keys(ETIQUETA_VISTA) as VistaSeleccionable[]).map((vista) => (
          <Button
            key={vista}
            variant={d.vista === vista ? 'primary' : 'secondary'}
            type="button"
            aria-pressed={d.vista === vista}
            onClick={() => d.cambiarVista(vista)}
          >
            {ETIQUETA_VISTA[vista]}
          </Button>
        ))}
      </div>

      {d.esProhibido && <Mensaje>No tienes autorización para ver este reporte.</Mensaje>}

      {!d.esProhibido && d.error && (
        <Card variant="outlined">
          <CardBody>
            <Mensaje>No se pudo cargar el dashboard.</Mensaje>
            <Button variant="primary" type="button" onClick={d.reintentar}>
              Reintentar
            </Button>
          </CardBody>
        </Card>
      )}

      {!d.esProhibido && !d.error && d.cargando && <Mensaje>Cargando el dashboard...</Mensaje>}

      {!d.esProhibido && !d.error && !d.cargando && d.vacio && (
        <Mensaje>Sin viajes para mostrar.</Mensaje>
      )}

      {!d.esProhibido && !d.error && !d.cargando && d.viajes && !d.vacio && (
        <>
          <Card>
            <CardHeader>
              <p className="ui-text-body-sm" style={{ margin: 0 }}>
                Viajes
              </p>
            </CardHeader>
            <CardBody>
              <IndicadorFrescura proyeccion={d.viajes} />
              <Table<FilaViaje>
                aria-label="Viajes del reporte"
                data={[...d.viajes.filas]}
                rowKey={(fila) => fila.viaje_id}
                density="compact"
                columns={[
                  { key: 'viaje', header: 'Viaje', accessor: 'viaje_id' },
                  { key: 'estado', header: 'Estado', accessor: 'estado' },
                  {
                    key: 'creado',
                    header: 'Creado',
                    cell: (fila: FilaViaje) =>
                      fila.creado_en ? new Date(fila.creado_en).toLocaleString('es-MX') : '—',
                  },
                  {
                    key: 'cerrado',
                    header: 'Cerrado',
                    cell: (fila: FilaViaje) =>
                      fila.cerrado_en ? new Date(fila.cerrado_en).toLocaleString('es-MX') : '—',
                  },
                ]}
              />
            </CardBody>
          </Card>

          {d.vista === 'en_curso' ? (
            <ConteosCard
              titulo="Viajes en curso por estado"
              filas={conteosEnCurso(d.viajes.filas).map((c) => ({
                estado: c.estado,
                conteo: c.conteo,
              }))}
            />
          ) : (
            d.estados && (
              <Card>
                <CardHeader>
                  <p className="ui-text-body-sm" style={{ margin: 0 }}>
                    Cambios de estado en el periodo
                  </p>
                </CardHeader>
                <CardBody>
                  <IndicadorFrescura proyeccion={d.estados} />
                  <ConteosCard
                    titulo=""
                    filas={d.estados.conteos.map((c) => ({ estado: c.estado, conteo: c.conteo }))}
                  />
                </CardBody>
              </Card>
            )
          )}
        </>
      )}
    </div>
  );
}

function ConteosCard({
  titulo,
  filas,
}: {
  readonly titulo: string;
  readonly filas: readonly { readonly estado: string; readonly conteo: number }[];
}) {
  return (
    <Card>
      {titulo && (
        <CardHeader>
          <p className="ui-text-body-sm" style={{ margin: 0 }}>
            {titulo}
          </p>
        </CardHeader>
      )}
      <CardBody>
        <Table<{ readonly estado: string; readonly conteo: number }>
          aria-label={titulo || 'Conteos por estado'}
          data={[...filas]}
          rowKey={(fila) => fila.estado}
          density="compact"
          columns={[
            { key: 'estado', header: 'Estado', accessor: 'estado' },
            { key: 'conteo', header: 'Conteo', accessor: 'conteo' },
          ]}
        />
      </CardBody>
    </Card>
  );
}

function Mensaje({ children }: { readonly children: ReactNode }) {
  return (
    <p
      className="ui-text-body-sm"
      role="status"
      style={{ margin: 0, color: 'var(--ui-color-text)' }}
    >
      {children}
    </p>
  );
}
