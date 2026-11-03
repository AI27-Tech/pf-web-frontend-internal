import { useState } from 'react';
import {
  Button,
  MessageBubble,
  MessageComposer,
  MessageList,
  MessagePanel,
  Modal,
} from '@ai27-tech/ui';
import type { Conversacion, Mensaje } from '@/lib/contracts/conversaciones';
import { capacidades } from './afordancias';
import { BannerEstado } from './BannerEstado';

interface PanelConversacionProps {
  conversacion: Conversacion;
  mensajes: Mensaje[];
  sujetoId: string;
  borrador: string;
  setBorrador: (v: string) => void;
  enviando: boolean;
  accionEnCurso: 'reclamar' | 'devolver' | 'atendida' | null;
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
}

export function PanelConversacion({
  conversacion,
  mensajes,
  sujetoId,
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
}: PanelConversacionProps) {
  const [confirmarDevolucion, setConfirmarDevolucion] = useState(false);
  const c = capacidades(conversacion, sujetoId);
  const reclamante = conversacion.reclamo_activo?.responsable_id === sujetoId;
  const devolver = () => {
    if (borrador.trim()) setConfirmarDevolucion(true);
    else onDevolver();
  };
  return (
    <MessagePanel open name="Conversación" subtitle={`Viaje ${conversacion.viaje_id}`}>
      <BannerEstado
        razon={c.razonCompositor}
        desactualizada={desactualizada}
        actualizadoEn={actualizadoEn}
      />
      {error && (
        <p role="alert" aria-live="assertive">
          {error.message}
        </p>
      )}
      <div style={{ display: 'flex', gap: 'var(--ui-space-2)', padding: 'var(--ui-space-2)' }}>
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
        {c.puedeMarcarAtendida && !conversacion.atendida_en && (
          <Button variant="secondary" onClick={onAtendida} disabled={accionEnCurso !== null}>
            Marcar atendida
          </Button>
        )}
        {conversacion.atendida_en && <span>Atendida</span>}
      </div>
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
          <p>No hay mensajes todavía.</p>
        )}
      </MessageList>
      <MessageComposer
        value={borrador}
        onChange={setBorrador}
        onSend={() => onEnviar(borrador)}
        disabled={!reclamante || !c.puedeResponder || enviando}
        placeholder={c.razonCompositor ? 'No puedes responder todavía' : 'Escribe una respuesta'}
      />
      <Modal
        open={confirmarDevolucion}
        onClose={() => setConfirmarDevolucion(false)}
        title="Devolver conversación al pool"
      >
        <p>
          Hay un borrador sin enviar. Si devuelves la conversación, conservarás el texto localmente
          pero dejarás de ser responsable.
        </p>
        <div style={{ display: 'flex', gap: 'var(--ui-space-2)' }}>
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
        </div>
      </Modal>
    </MessagePanel>
  );
}
