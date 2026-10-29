/*
 * Ficha técnica del viaje (E8-T12).
 *
 * La vista separa datos conocidos, captura incremental y el histórico. El
 * formulario solo serializa los campos publicados por tracer.21; no inventa
 * destinos editables ni una lectura de escolta que el BFF no expone.
 */

import { useEffect } from 'react';

import { Button, Card, CardBody, CardFooter, CardHeader } from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';

import { useSession } from '@/context/SessionContext';
import type { FichaTecnica } from '@/lib/contracts/fichaTecnica';
import type { Unidad } from '@/lib/contracts/unidades';
import type { ViajeInterno } from '@/lib/contracts/viajeDetalle';

import { FichaEditor } from './FichaEditor';
import { useFichaTecnica } from './useFichaTecnica';

export interface FichaTecnicaViajeProps {
  readonly id: string;
}

export function FichaTecnicaViaje({ id }: FichaTecnicaViajeProps) {
  const { usuario } = useSession();
  const f = useFichaTecnica(id);
  const navigate = useNavigate();

  if (f.esNoAutorizado) {
    return <DelegacionSesion id={id} />;
  }

  if (usuario?.rol !== 'monitorista') {
    return (
      <AccesoNoAutorizado onVolver={() => void navigate({ to: '/viajes/$id', params: { id } })} />
    );
  }

  if (f.error) {
    return <EstadoError onReintentar={f.reintentar} />;
  }

  if (f.cargando) {
    return <EstadoCargando />;
  }

  if (!f.detalle) {
    return <EstadoVacio mensaje="No hay datos disponibles para este viaje." />;
  }

  const viaje = f.detalle.viaje;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--ui-space-3)',
        }}
      >
        <div>
          <h1 className="ui-text-headline-lg" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
            Ficha técnica del viaje
          </h1>
          <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}>
            Viaje: {viaje.id}
          </p>
        </div>
        <Button
          variant="secondary"
          type="button"
          onClick={() => void navigate({ to: '/viajes/$id', params: { id } })}
        >
          Volver al detalle
        </Button>
      </div>

      <DatosViaje viaje={viaje} />

      <Escolta
        unidades={f.escolta}
        cargando={f.cargandoEscolta}
        error={f.errorEscolta}
        onReintentar={f.reintentarEscolta}
      />

      <Card>
        <CardHeader>
          <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
            Ficha técnica confirmada
          </p>
        </CardHeader>
        {f.ficha ? (
          <FichaConfirmada ficha={f.ficha} />
        ) : (
          <EstadoFichaVacia inexistente={f.fichaVacia} />
        )}
      </Card>

      <FichaEditor
        key={f.ficha?.viaje_id ?? 'ficha-vacia'}
        viajeId={id}
        ficha={f.ficha}
        gps={f.gps}
        cargandoGps={f.cargandoGps}
        errorGps={f.errorGps}
        reintentarGps={f.reintentarGps}
        guardar={f.guardar}
        guardando={f.guardando}
      />
    </div>
  );
}

function DatosViaje({ viaje }: { readonly viaje: ViajeInterno }) {
  return (
    <Card>
      <CardHeader>
        <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
          Datos conocidos del viaje
        </p>
      </CardHeader>
      <CardBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-3)' }}>
          <Dato label="Origen" value={viaje.origen} />
          <Dato label="Tipo de servicio" value={viaje.tipo_servicio ?? 'No informado'} />
          <div>
            <p
              className="ui-text-body-xs"
              style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}
            >
              Destinos
            </p>
            {viaje.destinos.length > 0 ? (
              <ol style={{ margin: 'var(--ui-space-1) 0 0', paddingLeft: 'var(--ui-space-4)' }}>
                {viaje.destinos.map((destino) => (
                  <li key={destino.numero_envio ?? destino.nombre}>
                    <span style={{ color: 'var(--ui-color-text)' }}>{destino.nombre}</span>
                    {destino.numero_envio && (
                      <span style={{ color: 'var(--ui-color-text-muted)' }}>
                        {' '}
                        (Envío: {destino.numero_envio})
                      </span>
                    )}
                    {destino.arribo === true && (
                      <span style={{ color: 'var(--ui-color-text-muted)' }}> — arribó</span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p
                className="ui-text-body-sm"
                style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}
              >
                No hay destinos informados.
              </p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function Escolta({
  unidades,
  cargando,
  error,
  onReintentar,
}: {
  readonly unidades: Unidad[];
  readonly cargando: boolean;
  readonly error: Error | null;
  readonly onReintentar: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
          Escolta (derivada de la asignación)
        </p>
      </CardHeader>
      <CardBody>
        {cargando ? (
          <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}>
            Cargando la escolta...
          </p>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-2)' }}>
            <p
              role="alert"
              className="ui-text-body-sm"
              style={{ margin: 0, color: 'var(--ui-color-error)' }}
            >
              No se pudo cargar la escolta.
            </p>
            <Button variant="secondary" type="button" onClick={onReintentar}>
              Reintentar escolta
            </Button>
          </div>
        ) : unidades.length === 0 ? (
          <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}>
            No hay unidades en la escolta de este viaje.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 'var(--ui-space-4)' }}>
            {unidades.map((unidad) => (
              <li key={unidad.id} style={{ color: 'var(--ui-color-text)' }}>
                <span>Unidad {unidad.id}</span>
                <span style={{ color: 'var(--ui-color-text-muted)' }}>
                  {' '}
                  — {unidad.tipo} · vehículo {unidad.vehiculo_id} · {unidad.custodios_ids.length}{' '}
                  custodio(s)
                </span>
              </li>
            ))}
          </ul>
        )}
        <p
          className="ui-text-body-xs"
          style={{ margin: 'var(--ui-space-2) 0 0', color: 'var(--ui-color-text-muted)' }}
        >
          La escolta se deriva de la asignación; no se recapturan custodios ni patrullas.
        </p>
      </CardBody>
    </Card>
  );
}

function FichaConfirmada({ ficha }: { readonly ficha: FichaTecnica }) {
  return (
    <CardBody>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-3)' }}>
        <Dato label="Tracto" value={ficha.tracto ? 'Capturado' : 'No informado'} />
        <Dato label="Contenedores" value={String(ficha.contenedores?.length ?? 0)} />
        <Dato label="GPS registrados" value={String(ficha.gps_ids?.length ?? 0)} />
        <p className="ui-text-body-xs" style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}>
          La escolta y el histórico operativo se consultan en sus superficies correspondientes.
        </p>
      </div>
    </CardBody>
  );
}

function Dato({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="ui-text-body-xs" style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}>
        {label}
      </p>
      <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
        {value}
      </p>
    </div>
  );
}

function EstadoFichaVacia({ inexistente }: { readonly inexistente: boolean }) {
  return (
    <CardBody>
      <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}>
        {inexistente
          ? 'La ficha aún no existe para este viaje. Puedes capturarla abajo.'
          : 'La ficha no tiene datos capturados. Puedes completarla abajo.'}
      </p>
    </CardBody>
  );
}

function EstadoCargando() {
  return (
    <Card>
      <CardBody>
        <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
          Cargando la ficha técnica...
        </p>
      </CardBody>
    </Card>
  );
}

function EstadoError({ onReintentar }: { readonly onReintentar: () => void }) {
  return (
    <Card variant="outlined">
      <CardBody>
        <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
          No se pudo cargar la ficha técnica del viaje.
        </p>
      </CardBody>
      <CardFooter>
        <Button variant="primary" onClick={onReintentar}>
          Reintentar
        </Button>
      </CardFooter>
    </Card>
  );
}

function EstadoVacio({ mensaje }: { readonly mensaje: string }) {
  return (
    <Card>
      <CardBody>
        <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}>
          {mensaje}
        </p>
      </CardBody>
    </Card>
  );
}

function AccesoNoAutorizado({ onVolver }: { readonly onVolver: () => void }) {
  return (
    <Card variant="outlined">
      <CardBody>
        <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
          Esta ficha solo está disponible para el monitorista.
        </p>
      </CardBody>
      <CardFooter>
        <Button variant="secondary" type="button" onClick={onVolver}>
          Volver al detalle
        </Button>
      </CardFooter>
    </Card>
  );
}

function DelegacionSesion({ id }: { readonly id: string }) {
  const { logout } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      await logout();
      void navigate({ to: '/login', search: { redirect: `/viajes/${id}/ficha` } });
    })();
  }, [id, logout, navigate]);

  return null;
}
