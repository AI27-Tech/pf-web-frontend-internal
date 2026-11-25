/*
 * Diálogos de las acciones sobre una solicitud (M14, Requirement 15).
 *
 * Cada diálogo captura lo que pide el contrato, valida lo mínimo en cliente (campos obligatorios y
 * formato) y deja que el `bff` decida el resto: el servidor aplica el estado de origen, la
 * vigencia del pago y el rol, y su rechazo se explica con `mensajeErrorSolicitud`. Un error
 * conserva lo capturado y no cierra el diálogo.
 */
import { useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  DateInput,
  DateTimeInput,
  FormField,
  Input,
  Modal,
  Stack,
  Textarea,
} from '@ai27-tech/ui';
import type { Solicitud } from '@/lib/contracts/solicitudes';
import type { AccionSolicitud } from './afordancias';
import { aValorDateTime, deValorDateTime, formatearFecha, formatearFechaHora } from './estados';
import { mensajeErrorSolicitud } from './mensajes';
import { useAccionesSolicitud } from './useSolicitudes';

interface DialogoBaseProps {
  readonly solicitud: Solicitud;
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  /** Se llama al terminar bien, con el texto del aviso y la solicitud ya actualizada. */
  readonly onHecho: (accion: AccionSolicitud, texto: string, solicitud: Solicitud) => void;
}

interface MarcoProps {
  readonly titulo: string;
  readonly textoConfirmar: string;
  readonly variante?: 'primary' | 'danger';
  readonly abierto: boolean;
  readonly enviando: boolean;
  readonly puedeConfirmar: boolean;
  readonly error: string | null;
  readonly onCerrar: () => void;
  readonly onConfirmar: () => void;
  readonly children: ReactNode;
}

function Marco({
  titulo,
  textoConfirmar,
  variante = 'primary',
  abierto,
  enviando,
  puedeConfirmar,
  error,
  onCerrar,
  onConfirmar,
  children,
}: MarcoProps) {
  return (
    <Modal
      open={abierto}
      onClose={() => {
        if (!enviando) onCerrar();
      }}
      title={titulo}
      closeOnEsc={!enviando}
      closeOnOverlayClick={!enviando}
      showCloseButton={!enviando}
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant={variante} onClick={onConfirmar} disabled={!puedeConfirmar || enviando}>
            {enviando ? 'Enviando...' : textoConfirmar}
          </Button>
        </>
      }
    >
      <Stack gap={3}>
        {children}
        {error && <Alert variant="danger">{error}</Alert>}
      </Stack>
    </Modal>
  );
}

/** Ejecuta una mutación y reparte el resultado: éxito cierra y avisa, fallo se explica. */
function useEnvio(
  accion: AccionSolicitud,
  { onCerrar, onHecho }: DialogoBaseProps,
  textoExito: string,
) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviar = async (peticion: () => Promise<Solicitud>) => {
    if (enviando) return;
    setError(null);
    setEnviando(true);
    try {
      const actualizada = await peticion();
      onCerrar();
      onHecho(accion, textoExito, actualizada);
    } catch (fallo) {
      setError(mensajeErrorSolicitud(fallo, accion));
    } finally {
      setEnviando(false);
    }
  };
  return { error, enviando, enviar };
}

/* -------------------------------------------------------------------------- */

export function DialogoAprobar(props: DialogoBaseProps) {
  const { solicitud, abierto, onCerrar } = props;
  const acciones = useAccionesSolicitud(solicitud.id);
  const { error, enviando, enviar } = useEnvio(
    'aprobar',
    props,
    'Solicitud aprobada. El viaje ya existe.',
  );
  return (
    <Marco
      titulo="Aprobar solicitud"
      textoConfirmar="Aprobar"
      abierto={abierto}
      enviando={enviando}
      puedeConfirmar
      error={error}
      onCerrar={onCerrar}
      onConfirmar={() => void enviar(() => acciones.aprobar.mutateAsync())}
    >
      <p>
        Al aprobar se crea el viaje con el mismo identificador y queda listo para asignar escolta.
        Fecha y hora del servicio:{' '}
        <strong>{formatearFechaHora(solicitud.fecha_hora_servicio)}</strong>.
      </p>
    </Marco>
  );
}

/** Motivo obligatorio: lo usan el rechazo y la reversa del pago. */
function DialogoMotivo({
  accion,
  titulo,
  textoConfirmar,
  textoExito,
  descripcion,
  etiqueta,
  ...props
}: DialogoBaseProps & {
  readonly accion: 'rechazar' | 'revertirPago';
  readonly titulo: string;
  readonly textoConfirmar: string;
  readonly textoExito: string;
  readonly descripcion: string;
  readonly etiqueta: string;
}) {
  const { solicitud, abierto, onCerrar } = props;
  const acciones = useAccionesSolicitud(solicitud.id);
  const { error, enviando, enviar } = useEnvio(accion, props, textoExito);
  const [motivo, setMotivo] = useState('');
  const limpio = motivo.trim();
  return (
    <Marco
      titulo={titulo}
      textoConfirmar={textoConfirmar}
      variante="danger"
      abierto={abierto}
      enviando={enviando}
      puedeConfirmar={limpio.length > 0}
      error={error}
      onCerrar={onCerrar}
      onConfirmar={() =>
        void enviar(() =>
          accion === 'rechazar'
            ? acciones.rechazar.mutateAsync(limpio)
            : acciones.revertir.mutateAsync(limpio),
        )
      }
    >
      <p>{descripcion}</p>
      <FormField label={etiqueta} htmlFor={`motivo-${accion}`} required>
        <Textarea
          id={`motivo-${accion}`}
          rows={3}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          disabled={enviando}
        />
      </FormField>
    </Marco>
  );
}

export function DialogoRechazar(props: DialogoBaseProps) {
  return (
    <DialogoMotivo
      {...props}
      accion="rechazar"
      titulo="Rechazar solicitud"
      textoConfirmar="Rechazar"
      textoExito="Solicitud rechazada."
      descripcion="La solicitud pasa a rechazada por AI27 y no se crea viaje. El cliente ve el motivo."
      etiqueta="Motivo del rechazo"
    />
  );
}

export function DialogoRevertirPago(props: DialogoBaseProps) {
  return (
    <DialogoMotivo
      {...props}
      accion="revertirPago"
      titulo="Revertir pago"
      textoConfirmar="Revertir pago"
      textoExito="Pago revertido. La solicitud volvió a cotizada."
      descripcion="Úsalo cuando el pago se confirmó por error. La solicitud regresa a cotizada y sale de la bandeja del Jefe Operativo."
      etiqueta="Motivo de la reversa"
    />
  );
}

/* -------------------------------------------------------------------------- */

/** Importe como decimal en texto, sin signo ni separador de miles (contrato `Monto`). */
const FORMATO_MONTO = /^\d+(\.\d+)?$/;

export function DialogoCotizar(props: DialogoBaseProps) {
  const { solicitud, abierto, onCerrar } = props;
  const recotiza = solicitud.estado === 'COTIZADO';
  const acciones = useAccionesSolicitud(solicitud.id);
  const { error, enviando, enviar } = useEnvio(
    'cotizar',
    props,
    recotiza ? 'Recotización enviada.' : 'Cotización enviada.',
  );
  const previa = solicitud.cotizacion;
  const [monto, setMonto] = useState(previa?.monto ?? '');
  const [moneda, setMoneda] = useState(previa?.moneda ?? 'MXN');
  const [fecha, setFecha] = useState(
    aValorDateTime(previa?.fecha_hora_servicio ?? solicitud.fecha_hora_servicio),
  );
  const [notas, setNotas] = useState(previa?.notas ?? '');

  const montoLimpio = monto.trim();
  const errorMonto =
    montoLimpio.length > 0 && !FORMATO_MONTO.test(montoLimpio)
      ? 'Escribe el importe con números y, si hace falta, punto decimal.'
      : undefined;
  const completo = FORMATO_MONTO.test(montoLimpio) && moneda.trim().length > 0 && fecha.length > 0;

  return (
    <Marco
      titulo={recotiza ? 'Recotizar solicitud' : 'Cotizar solicitud'}
      textoConfirmar={recotiza ? 'Enviar recotización' : 'Enviar cotización'}
      abierto={abierto}
      enviando={enviando}
      puedeConfirmar={completo}
      error={error}
      onCerrar={onCerrar}
      onConfirmar={() =>
        void enviar(() =>
          acciones.cotizar.mutateAsync({
            monto: montoLimpio,
            moneda: moneda.trim().toUpperCase(),
            fecha_hora_servicio: deValorDateTime(fecha),
            ...(notas.trim() ? { notas: notas.trim() } : {}),
          }),
        )
      }
    >
      <p>
        La cotización vale 15 días desde que se envía. Argos no valida la disponibilidad de
        unidades: consúltala con el Jefe Operativo.
      </p>
      <FormField label="Monto" htmlFor="cotizacion-monto" error={errorMonto} required>
        <Input
          id="cotizacion-monto"
          inputMode="decimal"
          value={monto}
          onChange={(evento) => setMonto(evento.target.value)}
          disabled={enviando}
        />
      </FormField>
      <FormField label="Moneda" htmlFor="cotizacion-moneda" required>
        <Input
          id="cotizacion-moneda"
          value={moneda}
          onChange={(evento) => setMoneda(evento.target.value)}
          disabled={enviando}
        />
      </FormField>
      <FormField label="Fecha y hora del servicio" required>
        <DateTimeInput value={fecha} onChange={setFecha} disabled={enviando} />
      </FormField>
      <FormField label="Notas" htmlFor="cotizacion-notas">
        <Textarea
          id="cotizacion-notas"
          rows={3}
          value={notas}
          onChange={(evento) => setNotas(evento.target.value)}
          disabled={enviando}
        />
      </FormField>
    </Marco>
  );
}

export function DialogoReprogramar(props: DialogoBaseProps) {
  const { solicitud, abierto, onCerrar } = props;
  const acciones = useAccionesSolicitud(solicitud.id);
  const { error, enviando, enviar } = useEnvio('reprogramar', props, 'Fecha y hora reprogramada.');
  const [fecha, setFecha] = useState(aValorDateTime(solicitud.fecha_hora_servicio));
  const [motivo, setMotivo] = useState('');
  return (
    <Marco
      titulo="Reprogramar solicitud"
      textoConfirmar="Reprogramar"
      abierto={abierto}
      enviando={enviando}
      puedeConfirmar={fecha.length > 0 && motivo.trim().length > 0}
      error={error}
      onCerrar={onCerrar}
      onConfirmar={() =>
        void enviar(() =>
          acciones.reprogramar.mutateAsync({
            fecha_hora_servicio: deValorDateTime(fecha),
            motivo: motivo.trim(),
          }),
        )
      }
    >
      <p>
        Acuerda la nueva fecha con el cliente en la conversación de la solicitud. No hay pago nuevo
        ni cambio de estado.
      </p>
      <FormField label="Nueva fecha y hora del servicio" required>
        <DateTimeInput value={fecha} onChange={setFecha} disabled={enviando} />
      </FormField>
      <FormField label="Motivo de la reprogramación" htmlFor="reprogramacion-motivo" required>
        <Textarea
          id="reprogramacion-motivo"
          rows={3}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          disabled={enviando}
        />
      </FormField>
    </Marco>
  );
}

export function DialogoConfirmarPago(props: DialogoBaseProps) {
  const { solicitud, abierto, onCerrar } = props;
  const acciones = useAccionesSolicitud(solicitud.id);
  const { error, enviando, enviar } = useEnvio(
    'confirmarPago',
    props,
    'Pago confirmado. La solicitud pasó al Jefe Operativo.',
  );
  const [fechaPago, setFechaPago] = useState('');
  const [referencia, setReferencia] = useState('');
  const vigencia = solicitud.cotizacion?.vigente_hasta;
  return (
    <Marco
      titulo="Confirmar pago"
      textoConfirmar="Confirmar pago"
      abierto={abierto}
      enviando={enviando}
      puedeConfirmar={fechaPago.length > 0}
      error={error}
      onCerrar={onCerrar}
      onConfirmar={() =>
        void enviar(() =>
          acciones.confirmar.mutateAsync({
            fecha_pago: fechaPago,
            ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
          }),
        )
      }
    >
      <p>
        El pago ocurre fuera de Argos. Confirma aquí que el cliente pagó.
        {vigencia
          ? ` La fecha del pago debe caer en la vigencia: hasta el ${formatearFecha(vigencia)}.`
          : ''}
      </p>
      <FormField label="Fecha del pago" required>
        <DateInput
          value={fechaPago}
          onChange={setFechaPago}
          displayFormat="AAAA Mmm DD"
          disabled={enviando}
        />
      </FormField>
      <FormField label="Referencia" htmlFor="pago-referencia">
        <Input
          id="pago-referencia"
          value={referencia}
          onChange={(evento) => setReferencia(evento.target.value)}
          disabled={enviando}
        />
      </FormField>
    </Marco>
  );
}
