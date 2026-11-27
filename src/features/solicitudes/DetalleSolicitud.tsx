/*
 * Detalle de una solicitud (M14, Requirement 15).
 *
 * Sigue la estructura del detalle de viaje: encabezado con migas y estado, alertas, columna
 * principal de datos y columna lateral de acciones e histórico. El skeleton de carga repite esa
 * misma forma con componentes de `@ai27-tech/ui`.
 *
 * Datos del servicio para todos los roles con acceso; cotización, pago y notas solo para quien ve
 * datos comerciales. El Jefe Operativo nunca los pinta: `null` o ausencia es "oculto", no "sin
 * cotizar" (DEC-148 #67). Un `404` del Jefe Operativo es una solicitud resuelta, no un error
 * (Requirement 15.4). Las acciones salen de `accionesPermitidas` (rol y estado).
 */
import { useState } from 'react';
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  EmptyState,
  Grid,
  Inline,
  PageHeader,
  Skeleton,
  SkeletonCard,
  Stack,
  Stat,
  Timeline,
  type DescriptionListItem,
} from '@ai27-tech/ui';
import { CalendarClock, ClipboardList } from 'lucide-react';
import { BloqueError } from '@/components/feedback/BloqueError';
import { SinPermiso } from '@/components/permisos/SinPermiso';
import { useSession } from '@/context/SessionContext';
import { esNoEncontrado, esProhibido, esSesionInvalida } from '@/lib/api/errors';
import type { HistoricoSolicitudItem, Solicitud } from '@/lib/contracts/solicitudes';
import {
  accionesPermitidas,
  aprobacionBloqueada,
  etiquetaCotizar,
  veDatosComerciales,
  type AccionSolicitud,
} from './afordancias';
import {
  DialogoAprobar,
  DialogoConfirmarPago,
  DialogoCotizar,
  DialogoRechazar,
  DialogoReprogramar,
  DialogoRevertirPago,
} from './DialogosSolicitud';
import {
  ETIQUETA_ESTADO,
  VARIANTE_ESTADO,
  etiquetaAccion,
  etiquetaAviso,
  formatearFecha,
  formatearFechaHora,
} from './estados';
import { useHistoricoSolicitud, useSolicitud } from './useSolicitudes';
import { nombreCliente } from './vista';

interface DetalleSolicitudProps {
  readonly id: string;
  readonly onVolver: () => void;
  readonly onAviso: (texto: string, tipo: 'exito' | 'error') => void;
  /** Tras aprobar, el viaje existe con el mismo id (Requirement 15.5). */
  readonly onVerViaje: (id: string) => void;
}

const ETIQUETA_BOTON: Record<Exclude<AccionSolicitud, 'cotizar'>, string> = {
  reprogramar: 'Reprogramar',
  confirmarPago: 'Confirmar pago',
  revertirPago: 'Revertir pago',
  aprobar: 'Aprobar',
  rechazar: 'Rechazar',
};

export function DetalleSolicitud({ id, onVolver, onAviso, onVerViaje }: DetalleSolicitudProps) {
  const { usuario } = useSession();
  const rol = usuario?.rol;
  const comercial = veDatosComerciales(rol);
  const consulta = useSolicitud(id);
  const historico = useHistoricoSolicitud(id);
  const [abierta, setAbierta] = useState<AccionSolicitud | null>(null);

  if (esSesionInvalida(consulta.error)) return null;
  if (consulta.isPending)
    return <EstadoCargando id={id} comercial={comercial} onVolver={onVolver} />;
  if (esProhibido(consulta.error)) {
    return (
      <Stack gap={4}>
        <Encabezado id={id} titulo="Solicitud" onVolver={onVolver} />
        <SinPermiso descripcion="No tienes permiso para ver esta solicitud." />
      </Stack>
    );
  }
  if (esNoEncontrado(consulta.error)) {
    return (
      <Stack gap={4}>
        <Encabezado id={id} titulo="Solicitud" onVolver={onVolver} />
        {comercial ? (
          <EmptyState
            icon={<ClipboardList aria-hidden="true" />}
            title="Solicitud no encontrada"
            description="La solicitud no existe o ya no está disponible."
          />
        ) : (
          <EmptyState
            icon={<ClipboardList aria-hidden="true" />}
            title="Solicitud resuelta"
            description="Esta solicitud ya no está en tu bandeja: se aprobó, se rechazó o cambió de estado."
          />
        )}
      </Stack>
    );
  }
  if (consulta.error || !consulta.data) {
    return (
      <Stack gap={4}>
        <Encabezado id={id} titulo="Solicitud" onVolver={onVolver} />
        <BloqueError
          mensaje="No se pudo cargar la solicitud."
          onReintentar={() => void consulta.refetch()}
        />
      </Stack>
    );
  }

  const solicitud = consulta.data;
  const acciones = accionesPermitidas(solicitud.estado, rol);
  const bloqueadaAprobar = acciones.includes('aprobar') && aprobacionBloqueada(solicitud);

  const hecho = (accion: AccionSolicitud, texto: string) => {
    onAviso(texto, 'exito');
    if (accion === 'aprobar') onVerViaje(solicitud.id);
    // Para el Jefe Operativo la solicitud sale de su bandeja: no hay nada más que ver aquí.
    else if (!comercial && accion === 'rechazar') onVolver();
  };
  const dialogo = { solicitud, abierto: true, onCerrar: () => setAbierta(null), onHecho: hecho };

  return (
    <Stack gap={4}>
      <PageHeader
        breadcrumb={<Migas id={solicitud.id} onVolver={onVolver} />}
        title={
          <Inline gap={2} align="center">
            <span>{`Solicitud de ${nombreCliente(solicitud)}`}</span>
            <Badge variant={VARIANTE_ESTADO[solicitud.estado]}>
              {ETIQUETA_ESTADO[solicitud.estado]}
            </Badge>
            {solicitud.avisos.map((aviso) => (
              <Badge key={aviso} variant="warning" size="sm">
                {etiquetaAviso(aviso)}
              </Badge>
            ))}
          </Inline>
        }
      />

      {solicitud.estado === 'RECHAZADO_POR_AI27' && solicitud.motivo_rechazo && (
        <Alert variant="warning">Motivo del rechazo: {solicitud.motivo_rechazo}</Alert>
      )}
      {comercial && solicitud.marca_penalizacion && (
        <Alert variant="warning">
          El cliente canceló estando pagada la solicitud: lleva marca de penalización.
        </Alert>
      )}

      <Grid minItemWidth="22rem" gap={4}>
        <Stack gap={4}>
          <Grid minItemWidth="12rem" gap={4}>
            <Stat
              label="Fecha y hora del servicio"
              value={formatearFechaHora(solicitud.fecha_hora_servicio) || 'Sin fecha'}
              icon={<CalendarClock size={18} aria-hidden="true" />}
            />
            {comercial && (
              <Stat
                label="Cotización vigente"
                value={
                  solicitud.cotizacion
                    ? `${solicitud.cotizacion.monto} ${solicitud.cotizacion.moneda}`
                    : 'Sin cotizar'
                }
                helpText={
                  solicitud.cotizacion ? `Versión ${solicitud.cotizacion.version}` : undefined
                }
              />
            )}
          </Grid>

          <Card>
            <CardHeader title="Ruta" />
            <CardBody>
              <DescriptionList
                columns={1}
                orientation="vertical"
                emptyValue="—"
                items={datosDeRuta(solicitud)}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Servicio" />
            <CardBody>
              <DescriptionList
                columns={2}
                orientation="vertical"
                emptyValue="—"
                items={datosDelServicio(solicitud)}
              />
            </CardBody>
          </Card>

          {comercial && (
            <Card>
              <CardHeader title="Cotización y pago" />
              <CardBody>
                <DescriptionList
                  columns={2}
                  orientation="vertical"
                  emptyValue="—"
                  items={datosComerciales(solicitud)}
                />
              </CardBody>
            </Card>
          )}
        </Stack>

        <Stack gap={4}>
          {acciones.length > 0 && (
            <Card>
              <CardHeader title="Acciones" />
              <CardBody>
                <Stack gap={3}>
                  {acciones.map((accion) => (
                    <Button
                      key={accion}
                      variant={
                        accion === 'rechazar' || accion === 'revertirPago' ? 'outline' : 'primary'
                      }
                      onClick={() => setAbierta(accion)}
                      disabled={accion === 'aprobar' && bloqueadaAprobar}
                    >
                      {accion === 'cotizar'
                        ? etiquetaCotizar(solicitud.estado)
                        : ETIQUETA_BOTON[accion]}
                    </Button>
                  ))}
                  {bloqueadaAprobar && (
                    <Alert variant="info">
                      No se puede aprobar sin fecha y hora del servicio. Pídele a Cotización que la
                      reprograme.
                    </Alert>
                  )}
                </Stack>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Histórico" />
            <CardBody>
              {historico.isError ? (
                <BloqueError
                  mensaje="No se pudo cargar el histórico."
                  onReintentar={() => void historico.refetch()}
                />
              ) : (
                <Timeline
                  loading={historico.isPending}
                  aria-label="Histórico de la solicitud"
                  items={(historico.data?.items ?? []).map((item, indice) =>
                    itemDeHistorico(item, indice, comercial),
                  )}
                  emptyState={<EmptyState size="sm" title="Aún no hay movimientos." />}
                />
              )}
            </CardBody>
          </Card>
        </Stack>
      </Grid>

      {abierta === 'aprobar' && <DialogoAprobar {...dialogo} />}
      {abierta === 'rechazar' && <DialogoRechazar {...dialogo} />}
      {abierta === 'cotizar' && <DialogoCotizar {...dialogo} />}
      {abierta === 'reprogramar' && <DialogoReprogramar {...dialogo} />}
      {abierta === 'confirmarPago' && <DialogoConfirmarPago {...dialogo} />}
      {abierta === 'revertirPago' && <DialogoRevertirPago {...dialogo} />}
    </Stack>
  );
}

/** Migas de la solicitud, igual que las del viaje: vuelven a la bandeja. */
function Migas({ id, onVolver }: { readonly id: string; readonly onVolver: () => void }) {
  return (
    <Breadcrumb
      items={[{ label: 'Solicitudes', onClick: onVolver }, { label: `Solicitud ${id}` }]}
    />
  );
}

/** Encabezado para los estados sin datos (carga, error, 403, 404). */
function Encabezado({
  id,
  titulo,
  onVolver,
}: {
  readonly id: string;
  readonly titulo: string;
  readonly onVolver: () => void;
}) {
  return <PageHeader breadcrumb={<Migas id={id} onVolver={onVolver} />} title={titulo} />;
}

/**
 * Skeleton con la misma forma que el detalle cargado: encabezado con migas, dos métricas, la
 * columna de tarjetas de datos a la izquierda y la de acciones e histórico a la derecha.
 */
function EstadoCargando({
  id,
  comercial,
  onVolver,
}: {
  readonly id: string;
  readonly comercial: boolean;
  readonly onVolver: () => void;
}) {
  return (
    <div role="status" aria-label="Cargando la solicitud">
      <Stack gap={4}>
        <PageHeader
          breadcrumb={<Migas id={id} onVolver={onVolver} />}
          title={<Skeleton width="16rem" height="1.5rem" />}
        />
        <Grid minItemWidth="22rem" gap={4}>
          <Stack gap={4}>
            <Grid minItemWidth="12rem" gap={4}>
              <Stat label="Fecha y hora del servicio" value="" loading />
              {comercial && <Stat label="Cotización vigente" value="" loading />}
            </Grid>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={4} />
            {comercial && <SkeletonCard lines={5} />}
          </Stack>
          <Stack gap={4}>
            <SkeletonCard lines={3} />
            <Card>
              <CardHeader title="Histórico" />
              <CardBody>
                <Timeline loading items={[]} aria-label="Cargando el histórico de la solicitud" />
              </CardBody>
            </Card>
          </Stack>
        </Grid>
      </Stack>
    </div>
  );
}

function datosDeRuta(solicitud: Solicitud): DescriptionListItem[] {
  return [
    { label: 'Origen', value: solicitud.origen },
    ...solicitud.destinos.map((destino, indice) => ({
      label: `Parada ${indice + 1}`,
      value: destino.nombre,
    })),
  ];
}

function datosDelServicio(solicitud: Solicitud): DescriptionListItem[] {
  const tracto = solicitud.tracto
    ? [solicitud.tracto.economico, solicitud.tracto.placas].filter(Boolean).join(' · ')
    : '';
  return [
    { label: 'Cliente', value: nombreCliente(solicitud) },
    { label: 'Tipo de servicio', value: solicitud.tipo_servicio ?? '' },
    { label: 'Tracto', value: tracto },
    { label: 'Creada', value: formatearFechaHora(solicitud.creado_en) },
  ];
}

function datosComerciales(solicitud: Solicitud): DescriptionListItem[] {
  const { cotizacion, pago } = solicitud;
  return [
    {
      label: 'Cotización vigente',
      value: cotizacion
        ? `${cotizacion.monto} ${cotizacion.moneda} (versión ${cotizacion.version})`
        : '',
    },
    { label: 'Entregada', value: formatearFechaHora(cotizacion?.entregada_en) },
    { label: 'Vigente hasta', value: formatearFecha(cotizacion?.vigente_hasta) },
    { label: 'Notas de la cotización', value: cotizacion?.notas ?? '' },
    { label: 'Fecha del pago', value: formatearFecha(pago?.fecha_pago) },
    { label: 'Referencia del pago', value: pago?.referencia ?? '' },
    { label: 'Pago confirmado', value: formatearFechaHora(pago?.confirmado_en) },
  ];
}

/**
 * El `motivo` de `pago_revertido` es texto libre que puede nombrar montos o referencias: el `bff`
 * lo manda `null` al Jefe Operativo y la UI tampoco lo pinta si llegara (DEC-148 #73). El de
 * `reprogramada` es operativo y sí se muestra.
 */
function motivoVisible(item: HistoricoSolicitudItem, comercial: boolean): boolean {
  if (!item.motivo) return false;
  return comercial || item.accion !== 'pago_revertido';
}

function itemDeHistorico(item: HistoricoSolicitudItem, indice: number, comercial: boolean) {
  const cambio =
    item.de_estado && item.a_estado
      ? `${ETIQUETA_ESTADO[item.de_estado]} → ${ETIQUETA_ESTADO[item.a_estado]}`
      : item.a_estado
        ? ETIQUETA_ESTADO[item.a_estado]
        : undefined;
  const detalle = [
    cambio,
    // Cada versión de la cotización es dato comercial: el Jefe Operativo no la ve (DEC-148 #67).
    comercial && item.cotizacion
      ? `${item.cotizacion.monto} ${item.cotizacion.moneda} (versión ${item.cotizacion.version})`
      : undefined,
    motivoVisible(item, comercial) ? `Motivo: ${item.motivo}` : undefined,
  ].filter(Boolean);
  return {
    id: `${item.en}-${indice}`,
    title: etiquetaAccion(item.accion),
    description: detalle.length > 0 ? detalle.join(' · ') : undefined,
    timestamp: formatearFechaHora(item.en),
    dateTime: item.en,
    status: 'completed' as const,
  };
}
