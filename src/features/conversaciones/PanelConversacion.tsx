import { useState } from 'react';
import {
  Alert,
  Button,
  EmptyState,
  Inline,
  MessageBubble,
  MessageComposer,
  MessageList,
  MessagePanel,
  Modal,
} from '@ai27-tech/ui';
import type { Conversacion, Mensaje } from '@/lib/contracts/conversaciones';
import { capacidades } from './afordancias';
import type { AccionEnCurso } from './useConversacion';
import { BannerEstado } from './BannerEstado';
import { DialogoTransferir } from './DialogoTransferir';

interface PanelConversacionProps {
  conversacion: Conversacion;
  mensajes: Mensaje[];
  sujetoId: string;
  /** El rol solo consulta (SUP y COO): sin reclamar, responder, devolver ni marcar atendida. */
  soloLectura: boolean;
  borrador: string;
  setBorrador: (v: string) => void;
  enviando: boolean;
  accionEnCurso: AccionEnCurso | null;
  error: Error | null;
  desactualizada: boolean;
  actualizadoEn: Date | null;
  hayMensajesAnteriores: boolean;
  cargandoAnteriores: boolean;
  onCargarAnteriores: () => void;
  onEnviar: (v: string) => void;
  onReclamar: () => void;
  onDevolver: () => void;
  onAtendida: () => void;
  /**
   * Solo en conversaciones de solicitud y para quien tiene `solicitud.transferir`: el destino es
   * un usuario de `cotizacion`. En viaje y emergencias no se ofrece (DT-28).
   */
  onTransferir?: (destinoId: string, motivo: string) => Promise<Error | null>;
}

export function PanelConversacion({
  conversacion,
  mensajes,
  sujetoId,
  soloLectura,
  borrador,
  setBorrador,
  enviando,
  accionEnCurso,
  error,
  desactualizada,
  actualizadoEn,
  hayMensajesAnteriores,
  cargandoAnteriores,
  onCargarAnteriores,
  onEnviar,
  onReclamar,
  onDevolver,
  onAtendida,
  onTransferir,
}: PanelConversacionProps) {
  const [confirmarDevolucion, setConfirmarDevolucion] = useState(false);
  const [transferir, setTransferir] = useState(false);
  const estado = capacidades(conversacion, sujetoId);
  // El estado de la conversación y del reclamo decide qué es posible; el rol, qué se ofrece (M10).
  const c = soloLectura
    ? {
        ...estado,
        puedeReclamar: false,
        puedeResponder: false,
        puedeDevolverAlPool: false,
        puedeMarcarAtendida: false,
      }
    : estado;
  const reclamante = conversacion.reclamo_activo?.responsable_id === sujetoId;
  // Solo el responsable transfiere, y solo una conversación de solicitud.
  const puedeTransferir =
    Boolean(onTransferir) && conversacion.tipo === 'solicitud' && c.puedeDevolverAlPool;
  const devolver = () => {
    if (borrador.trim()) setConfirmarDevolucion(true);
    else onDevolver();
  };
  return (
    <MessagePanel
      open
      name="Conversación"
      subtitle={`${conversacion.tipo === 'solicitud' ? 'Solicitud' : 'Viaje'} ${conversacion.viaje_id}`}
    >
      <BannerEstado
        razon={c.razonCompositor}
        desactualizada={desactualizada}
        actualizadoEn={actualizadoEn}
      />
      {soloLectura && (
        <Alert variant="info">Solo lectura: tu rol consulta la conversación, no la atiende.</Alert>
      )}
      {error && (
        <Alert variant="danger" aria-live="assertive">
          {error.message}
        </Alert>
      )}
      <Inline gap={2} wrap={false} align="stretch" style={{ padding: 'var(--ui-space-2)' }}>
        {c.puedeReclamar && (
          <Button onClick={onReclamar} disabled={accionEnCurso !== null}>
            Reclamar
          </Button>
        )}
        {c.puedeDevolverAlPool && (
          <Button variant="outline" onClick={devolver} disabled={accionEnCurso !== null}>
            Devolver al pool
          </Button>
        )}
        {puedeTransferir && (
          <Button
            variant="outline"
            onClick={() => setTransferir(true)}
            disabled={accionEnCurso !== null}
          >
            Transferir
          </Button>
        )}
        {c.puedeMarcarAtendida && !conversacion.atendida_en && (
          <Button variant="secondary" onClick={onAtendida} disabled={accionEnCurso !== null}>
            Marcar atendida
          </Button>
        )}
        {conversacion.atendida_en && <span>Atendida</span>}
      </Inline>
      {hayMensajesAnteriores && (
        <Button variant="outline" onClick={onCargarAnteriores} disabled={cargandoAnteriores}>
          {cargandoAnteriores ? 'Cargando historial...' : 'Cargar mensajes anteriores'}
        </Button>
      )}
      <MessageList>
        {mensajes.length ? (
          mensajes.map((mensaje) => (
            <MessageBubble
              key={mensaje.secuencia}
              own={mensaje.actor_real === sujetoId}
              author={mensaje.actor_real === sujetoId ? 'Tú' : mensaje.alias_mostrado}
              time={new Date(mensaje.creado_en).toLocaleTimeString()}
            >
              {mensaje.cuerpo}
            </MessageBubble>
          ))
        ) : (
          <EmptyState size="sm" title="No hay mensajes todavía." />
        )}
      </MessageList>
      {!soloLectura && (
        <MessageComposer
          value={borrador}
          onChange={setBorrador}
          onSend={() => onEnviar(borrador)}
          disabled={!reclamante || !c.puedeResponder || enviando}
          placeholder={c.razonCompositor ? 'No puedes responder todavía' : 'Escribe una respuesta'}
        />
      )}
      {transferir && onTransferir && (
        <DialogoTransferir
          abierto
          sujetoId={sujetoId}
          enviando={accionEnCurso === 'transferir'}
          onCerrar={() => setTransferir(false)}
          onTransferir={onTransferir}
        />
      )}
      <Modal
        open={confirmarDevolucion}
        onClose={() => setConfirmarDevolucion(false)}
        title="Devolver conversación al pool"
      >
        <p>
          Hay un borrador sin enviar. Si devuelves la conversación, conservarás el texto localmente
          pero dejarás de ser responsable.
        </p>
        <Inline gap={2} wrap={false} align="stretch">
          <Button variant="outline" onClick={() => setConfirmarDevolucion(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setConfirmarDevolucion(false);
              onDevolver();
            }}
            disabled={accionEnCurso !== null}
          >
            Devolver al pool
          </Button>
        </Inline>
      </Modal>
    </MessagePanel>
  );
}
