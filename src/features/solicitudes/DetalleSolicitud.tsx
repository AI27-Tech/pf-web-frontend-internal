/*
 * Detalle de una solicitud (M14, Requirement 15).
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
  Button,
  DescriptionList,
  EmptyState,
  Inline,
  PageHeader,
  Section,
  SkeletonText,
  Stack,
  Timeline,
  type DescriptionListItem,
} from '@ai27-tech/ui';
import { ClipboardList } from 'lucide-react';
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
  const historico = useHistoricoSolicitud(id, consulta.isSuccess);
  const [abierta, setAbierta] = useState<AccionSolicitud | null>(null);

  const volver = (
    <Button variant="ghost" onClick={onVolver}>
      Volver a la bandeja
    </Button>
  );

  if (esSesionInvalida(consulta.error)) return null;
  if (consulta.isPending) {
    return (
      <Stack gap={4}>
        <PageHeader title="Solicitud" actions={volver} />
        <SkeletonText lines={4} />
      </Stack>
    );
  }
  if (esProhibido(consulta.error)) {
    return (
      <Stack gap={4}>
        <PageHeader title="Solicitud" actions={volver} />
        <SinPermiso descripcion="No tienes permiso para ver esta solicitud." />
      </Stack>
    );
  }
  if (esNoEncontrado(consulta.error)) {
    return (
      <Stack gap={4}>
        <PageHeader title="Solicitud" actions={volver} />
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
        <PageHeader title="Solicitud" actions={volver} />
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
        title={`Solicitud de ${nombreCliente(solicitud)}`}
        description={`Identificador ${solicitud.id}`}
        actions={volver}
      />

      <Inline gap={2} align="center" wrap>
        <Badge variant={VARIANTE_ESTADO[solicitud.estado]}>
          {ETIQUETA_ESTADO[solicitud.estado]}
        </Badge>
        {solicitud.avisos.map((aviso) => (
          <Badge key={aviso} variant="warning" size="sm">
            {etiquetaAviso(aviso)}
          </Badge>
        ))}
      </Inline>

      {solicitud.estado === 'RECHAZADO_POR_AI27' && solicitud.motivo_rechazo && (
        <Alert variant="warning">Motivo del rechazo: {solicitud.motivo_rechazo}</Alert>
      )}
      {comercial && solicitud.marca_penalizacion && (
        <Alert variant="warning">
          El cliente canceló estando pagada la solicitud: lleva marca de penalización.
        </Alert>
      )}

      {acciones.length > 0 && (
        <Stack gap={2}>
          <Inline gap={2} wrap>
            {acciones.map((accion) => (
              <Button
                key={accion}
                variant={accion === 'rechazar' || accion === 'revertirPago' ? 'outline' : 'primary'}
                onClick={() => setAbierta(accion)}
                disabled={accion === 'aprobar' && bloqueadaAprobar}
              >
                {accion === 'cotizar' ? etiquetaCotizar(solicitud.estado) : ETIQUETA_BOTON[accion]}
              </Button>
            ))}
          </Inline>
          {bloqueadaAprobar && (
            <Alert variant="info">
              No se puede aprobar sin fecha y hora del servicio. Pídele a Cotización que la
              reprograme.
            </Alert>
          )}
        </Stack>
      )}

      <Section title="Servicio">
        <DescriptionList
          columns={2}
          orientation="vertical"
          emptyValue="—"
          items={datosDelServicio(solicitud)}
        />
      </Section>

      {comercial && (
        <Section title="Cotización y pago">
          <DescriptionList
            columns={2}
            orientation="vertical"
            emptyValue="—"
            items={datosComerciales(solicitud)}
          />
        </Section>
      )}

      <Section title="Histórico">
        {historico.isError ? (
          <BloqueError
            mensaje="No se pudo cargar el histórico."
            onReintentar={() => void historico.refetch()}
          />
        ) : (
          <Timeline
            aria-label="Histórico de la solicitud"
            items={(historico.data?.items ?? []).map((item, indice) =>
              itemDeHistorico(item, indice, comercial),
            )}
            emptyState={<EmptyState size="sm" title="Aún no hay movimientos." />}
          />
        )}
      </Section>

      {abierta === 'aprobar' && <DialogoAprobar {...dialogo} />}
      {abierta === 'rechazar' && <DialogoRechazar {...dialogo} />}
      {abierta === 'cotizar' && <DialogoCotizar {...dialogo} />}
      {abierta === 'reprogramar' && <DialogoReprogramar {...dialogo} />}
      {abierta === 'confirmarPago' && <DialogoConfirmarPago {...dialogo} />}
      {abierta === 'revertirPago' && <DialogoRevertirPago {...dialogo} />}
    </Stack>
  );
}

function datosDelServicio(solicitud: Solicitud): DescriptionListItem[] {
  const tracto = solicitud.tracto
    ? [solicitud.tracto.economico, solicitud.tracto.placas].filter(Boolean).join(' · ')
    : '';
  return [
    { label: 'Cliente', value: nombreCliente(solicitud) },
    { label: 'Origen', value: solicitud.origen },
    {
      label: 'Destinos',
      value: solicitud.destinos.map((destino) => destino.nombre).join(', '),
    },
    {
      label: 'Fecha y hora del servicio',
      value: formatearFechaHora(solicitud.fecha_hora_servicio),
    },
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
