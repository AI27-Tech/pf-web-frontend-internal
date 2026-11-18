/*
 * Ficha técnica del viaje (E8-T12).
 *
 * La vista separa datos conocidos, captura incremental y el histórico. El
 * formulario solo serializa los campos publicados por tracer.21. La escolta es la
 * asignación vigente del viaje (`obtenerAsignacion`, tracer.39), en solo lectura.
 */

import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  DescriptionList,
  Divider,
  EmptyState,
  Grid,
  Inline,
  Modal,
  Section,
  Skeleton,
  SkeletonTable,
  SkeletonText,
  Stack,
  Table,
  Timeline,
  Toast,
  ToastContainer,
} from '@ai27-tech/ui';
import type { Column, TimelineItemData } from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';

import { BloqueError } from '@/components/feedback/BloqueError';
import { useSession } from '@/context/SessionContext';
import type { DispositivoGps, FichaTecnica } from '@/lib/contracts/fichaTecnica';
import type { Unidad } from '@/lib/contracts/unidades';
import { custodiosLegibles, vehiculoLegible } from '../unidadLegible';
import type { ViajeInterno } from '@/lib/contracts/viajeDetalle';

import { datosDesdeFicha, type DatosFichaTecnica } from './adaptadorFichaTecnica';
import { FichaEditor } from './FichaEditor';
import { useFichaTecnica, type FichaTecnicaHook } from './useFichaTecnica';

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

  if (f.esProhibido) {
    return <SinPermiso onVolver={() => void navigate({ to: '/viajes/$id', params: { id } })} />;
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
    <Grid minItemWidth="22rem" gap={4}>
      <Stack gap={4}>
        <DatosViaje viaje={viaje} />

        <Escolta
          unidades={f.escolta}
          cargando={f.cargandoEscolta}
          error={f.errorEscolta}
          onReintentar={f.reintentarEscolta}
        />
      </Stack>

      <Stack gap={4}>
        <FichaSeccion key={id} viajeId={id} f={f} />
      </Stack>
    </Grid>
  );
}

interface AvisoFicha {
  readonly id: string;
  readonly mensaje: string;
}

/**
 * Ficha confirmada y su edición en un modal. El modal desmonta el editor al cerrarse,
 * así que el borrador vive aquí: cerrar sin guardar no pierde lo capturado. La clave
 * por viaje reinicia el borrador al cambiar de viaje.
 */
function FichaSeccion({ viajeId, f }: { readonly viajeId: string; readonly f: FichaTecnicaHook }) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState<DatosFichaTecnica | null>(null);
  const [avisos, setAvisos] = useState<AvisoFicha[]>([]);
  const avisoIdRef = useRef(0);

  // Sin borrador, el formulario muestra la ficha confirmada. El borrador se construye
  // sobre la ficha vigente en el momento del cambio, aunque aún no haya cargado.
  const datos = borrador ?? datosDesdeFicha(f.ficha);
  const cambiarDatos: Dispatch<SetStateAction<DatosFichaTecnica>> = (cambio) =>
    setBorrador((actual) => {
      const base = actual ?? datosDesdeFicha(f.ficha);
      return typeof cambio === 'function' ? cambio(base) : cambio;
    });

  const avisarGuardada = () => {
    const id = `aviso-ficha-${avisoIdRef.current++}`;
    setAvisos((previos) => [...previos, { id, mensaje: 'Ficha técnica guardada.' }]);
    setTimeout(() => {
      setAvisos((previos) => previos.filter((aviso) => aviso.id !== id));
    }, 4000);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <Inline gap={2} justify="between" align="center" wrap={false}>
            <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
              Ficha técnica confirmada
            </p>
            {f.ficha && (
              <Button variant="primary" type="button" onClick={() => setEditando(true)}>
                Editar ficha
              </Button>
            )}
          </Inline>
        </CardHeader>
        {f.ficha ? (
          <FichaConfirmada ficha={f.ficha} gps={f.gps} />
        ) : (
          <EstadoFichaVacia inexistente={f.fichaVacia} onCapturar={() => setEditando(true)} />
        )}
      </Card>

      <Modal
        open={editando}
        onClose={() => setEditando(false)}
        title="Editar ficha técnica"
        size="lg"
      >
        <FichaEditor
          viajeId={viajeId}
          datos={datos}
          setDatos={cambiarDatos}
          gps={f.gps}
          cargandoGps={f.cargandoGps}
          errorGps={f.errorGps}
          reintentarGps={f.reintentarGps}
          guardar={f.guardar}
          guardando={f.guardando}
          onGuardado={() => {
            setEditando(false);
            avisarGuardada();
          }}
        />
      </Modal>

      <ToastContainer position="top-right">
        {avisos.map((aviso) => (
          <Toast
            key={aviso.id}
            variant="success"
            title={aviso.mensaje}
            onClose={() =>
              setAvisos((previos) => previos.filter((previo) => previo.id !== aviso.id))
            }
          />
        ))}
      </ToastContainer>
    </>
  );
}

/** Origen y paradas en el orden en que llegan. Solo se marca como completada la que ya arribó. */
function puntosDeRuta(viaje: ViajeInterno): TimelineItemData[] {
  const origen: TimelineItemData = {
    id: 'origen',
    title: viaje.origen,
    description: 'Origen',
  };
  const paradas = viaje.destinos.map((destino, indice): TimelineItemData => {
    const envio = destino.numero_envio ? ` · Envío: ${destino.numero_envio}` : '';
    return {
      id: `parada-${indice}`,
      title: destino.nombre,
      description: `Parada ${indice + 1}${envio}`,
      status: destino.arribo === true ? 'completed' : 'upcoming',
      content:
        destino.arribo === true ? (
          <Badge variant="secure" size="sm">
            Arribó
          </Badge>
        ) : undefined,
    };
  });
  return [origen, ...paradas];
}

function DatosViaje({ viaje }: { readonly viaje: ViajeInterno }) {
  return (
    <Card>
      <CardBody>
        <Stack gap={5}>
          <Section title="Datos conocidos del viaje">
            <DescriptionList
              columns={1}
              items={[{ label: 'Tipo de servicio', value: viaje.tipo_servicio ?? 'No informado' }]}
            />
          </Section>
          <Section title="Ruta">
            <Timeline items={puntosDeRuta(viaje)} aria-label="Ruta del viaje" />
            {viaje.destinos.length === 0 && textoSecundario('No hay destinos informados.')}
          </Section>
        </Stack>
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
      <CardBody>
        <Section title="Escolta (derivada de la asignación)">
          {cargando ? (
            <p
              className="ui-text-body-sm"
              style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}
            >
              Cargando la escolta...
            </p>
          ) : error ? (
            // BloqueError fija la etiqueta "Reintentar"; esta prueba exige "Reintentar escolta".
            <Alert variant="danger">
              <Stack gap={2} align="start">
                <span>No se pudo cargar la escolta.</span>
                <Button variant="secondary" type="button" onClick={onReintentar}>
                  Reintentar escolta
                </Button>
              </Stack>
            </Alert>
          ) : unidades.length === 0 ? (
            <p
              className="ui-text-body-sm"
              style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}
            >
              Este viaje no tiene escolta asignada.
            </p>
          ) : (
            <Stack gap={3}>
              {unidades.map((unidad, indice) => (
                <Stack key={unidad.id} gap={2}>
                  {indice > 0 && <Divider />}
                  <Inline gap={2} align="center">
                    <span className="ui-text-label-md" style={{ color: 'var(--ui-color-text)' }}>
                      Unidad {unidad.id}
                    </span>
                    <Badge variant="escort" size="sm">
                      {unidad.tipo}
                    </Badge>
                  </Inline>
                  <DescriptionList
                    columns={2}
                    items={[
                      { label: 'Vehículo', value: vehiculoLegible(unidad) },
                      { label: 'Custodios', value: custodiosLegibles(unidad) },
                    ]}
                  />
                </Stack>
              ))}
            </Stack>
          )}
          <p
            className="ui-text-body-xs"
            style={{ margin: 'var(--ui-space-2) 0 0', color: 'var(--ui-color-text-muted)' }}
          >
            La escolta se deriva de la asignación; no se recapturan custodios ni patrullas.
          </p>
        </Section>
      </CardBody>
    </Card>
  );
}

type ContenedorFicha = NonNullable<FichaTecnica['contenedores']>[number];

const VACIO = '—';

const COLUMNAS_CONTENEDORES: Column<ContenedorFicha>[] = [
  { key: 'economico', header: 'Económico', cell: (c) => c.economico || VACIO },
  { key: 'placas', header: 'Placas', cell: (c) => c.placas || VACIO },
  { key: 'sello', header: 'Sello', cell: (c) => c.sello || VACIO },
  { key: 'color', header: 'Color', cell: (c) => c.color || VACIO },
];

function textoSecundario(texto: string) {
  return (
    <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}>
      {texto}
    </p>
  );
}

function FichaConfirmada({
  ficha,
  gps,
}: {
  readonly ficha: FichaTecnica;
  readonly gps: DispositivoGps[];
}) {
  const tracto = ficha.tracto ?? {};
  const tieneTracto = Object.values(tracto).some((valor) => String(valor ?? '').trim().length > 0);
  const contenedores = ficha.contenedores ?? [];
  const gpsIds = ficha.gps_ids ?? [];
  // El catálogo solo trae dispositivos activos: si un id ya no está, se muestra el id.
  const identificadores = new Map(gps.map((d) => [d.id, d.identificador]));

  return (
    <CardBody>
      <Stack gap={4}>
        <Section title="Tracto">
          {tieneTracto ? (
            <DescriptionList
              columns={3}
              items={[
                { label: 'Placas', value: tracto.placas },
                { label: 'Económico', value: tracto.economico },
                { label: 'Marca', value: tracto.marca },
                { label: 'Modelo', value: tracto.modelo },
                { label: 'Color', value: tracto.color },
              ]}
            />
          ) : (
            textoSecundario('Sin tracto informado.')
          )}
        </Section>

        <Section title={`Contenedores (${contenedores.length})`}>
          {contenedores.length > 0 ? (
            <Table<ContenedorFicha>
              columns={COLUMNAS_CONTENEDORES}
              data={contenedores}
              rowKey={(_, indice) => `contenedor-${indice}`}
              aria-label="Contenedores de la ficha"
              density="compact"
            />
          ) : (
            textoSecundario('Sin contenedores.')
          )}
        </Section>

        <Section title={`GPS registrados (${gpsIds.length})`}>
          {gpsIds.length > 0 ? (
            <Inline gap={2} wrap>
              {gpsIds.map((gpsId) => (
                <Badge key={gpsId} variant="neutral">
                  {identificadores.get(gpsId) ?? gpsId}
                </Badge>
              ))}
            </Inline>
          ) : (
            textoSecundario('Sin GPS registrados.')
          )}
        </Section>

        <p className="ui-text-body-xs" style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}>
          La escolta y el histórico operativo se consultan en sus superficies correspondientes.
        </p>
      </Stack>
    </CardBody>
  );
}

function EstadoFichaVacia({
  inexistente,
  onCapturar,
}: {
  readonly inexistente: boolean;
  readonly onCapturar: () => void;
}) {
  return (
    <CardBody>
      <Stack gap={3} align="start">
        <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}>
          {inexistente
            ? 'La ficha aún no existe para este viaje.'
            : 'La ficha no tiene datos capturados.'}
        </p>
        <Button variant="primary" type="button" onClick={onCapturar}>
          Capturar ficha
        </Button>
      </Stack>
    </CardBody>
  );
}

/** Esqueleto con la estructura de la vista: mismas columnas, tarjetas y listas de datos. */
function EstadoCargando() {
  const celdasTracto = [0, 1, 2, 3, 4];
  const gpsSimulados = [0, 1, 2];
  return (
    <div role="status" aria-label="Cargando la ficha técnica">
      <Grid minItemWidth="22rem" gap={4}>
        <Stack gap={4}>
          <Card>
            <CardBody>
              <Stack gap={5}>
                <Stack gap={3}>
                  <SkeletonText lines={1} />
                  <SkeletonText lines={1} />
                </Stack>
                <Stack gap={3}>
                  <SkeletonText lines={1} />
                  <SkeletonText lines={3} />
                </Stack>
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stack gap={3}>
                <SkeletonText lines={1} />
                <Stack gap={2}>
                  <Inline gap={2} align="center">
                    <Skeleton width="6rem" height="1rem" />
                    <Skeleton width="4rem" height="1.25rem" />
                  </Inline>
                  <Grid minItemWidth="8rem" gap={3}>
                    <SkeletonText lines={2} />
                    <SkeletonText lines={2} />
                  </Grid>
                </Stack>
              </Stack>
            </CardBody>
          </Card>
        </Stack>

        <Stack gap={4}>
          <Card>
            <CardHeader>
              <Inline gap={2} justify="between" align="center" wrap={false}>
                <Skeleton width="10rem" height="1rem" />
                <Skeleton width="6rem" height="2rem" />
              </Inline>
            </CardHeader>
            <CardBody>
              <Stack gap={4}>
                <Stack gap={2}>
                  <SkeletonText lines={1} />
                  <Grid minItemWidth="8rem" gap={3}>
                    {celdasTracto.map((celda) => (
                      <SkeletonText key={celda} lines={2} />
                    ))}
                  </Grid>
                </Stack>
                <Stack gap={2}>
                  <SkeletonText lines={1} />
                  <SkeletonTable rows={2} columns={4} density="compact" />
                </Stack>
                <Stack gap={2}>
                  <SkeletonText lines={1} />
                  <Inline gap={2} wrap>
                    {gpsSimulados.map((gps) => (
                      <Skeleton key={gps} width="6rem" height="1.25rem" />
                    ))}
                  </Inline>
                </Stack>
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      </Grid>
    </div>
  );
}

function EstadoError({ onReintentar }: { readonly onReintentar: () => void }) {
  return (
    <Card variant="outlined">
      <CardBody>
        <BloqueError
          mensaje="No se pudo cargar la ficha técnica del viaje."
          onReintentar={onReintentar}
        />
      </CardBody>
    </Card>
  );
}

function EstadoVacio({ mensaje }: { readonly mensaje: string }) {
  return (
    <Card>
      <CardBody>
        <EmptyState size="sm" title={mensaje} />
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

function SinPermiso({ onVolver }: { readonly onVolver: () => void }) {
  return (
    <Card variant="outlined">
      <CardBody>
        <Alert variant="danger">No tienes permiso para ver la ficha técnica de este viaje.</Alert>
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
