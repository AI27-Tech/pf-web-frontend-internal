import { useNavigate, useSearch } from '@tanstack/react-router';
import { Alert } from '@ai27-tech/ui';
import { BloqueError } from '@/components/feedback/BloqueError';
import { ErrorConversacionNoDisponible } from '@/lib/api/conversaciones';
import { useSession } from '@/context/SessionContext';
import { useTrabajoBandeja } from './useTrabajoBandeja';
import { useNombresCliente } from './useNombresCliente';
import { useConversacion } from './useConversacion';
import { ListaTrabajo } from './ListaTrabajo';
import { PanelConversacion } from './PanelConversacion';

export function BandejaConversaciones() {
  const { usuario } = useSession();
  const navigate = useNavigate();
  const search = useSearch({ from: '/_private/conversaciones' });
  const id = search.conversacion;
  const bandeja = useTrabajoBandeja();
  const nombres = useNombresCliente();
  const detalle = useConversacion(id);
  const seleccionar = (next: string) =>
    void (navigate as unknown as (options: { search: Record<string, string> }) => Promise<void>)({
      search: { conversacion: next },
    });
  const panelVisible = Boolean(detalle.conversacion && !detalle.cargando);
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--ui-space-4)',
        gridTemplateColumns: 'minmax(18rem, 32rem) minmax(0, 1fr)',
      }}
    >
      <section>
        <h1 className="ui-text-headline-lg">Bandeja de conversaciones</h1>
        <ListaTrabajo
          items={bandeja.items}
          sujetoId={usuario?.id ?? ''}
          nombres={nombres}
          {...(id ? { seleccionada: id } : {})}
          onSelect={seleccionar}
          onMas={() => void bandeja.cargarMas()}
          hayMas={Boolean(bandeja.cursor)}
          cargando={bandeja.cargando}
          cargandoMas={bandeja.cargandoMas}
          error={bandeja.error}
          reintentar={() => void bandeja.reintentar()}
          // Con el panel abierto, su banner ya avisa la desactualización (sin duplicarla).
          desactualizada={bandeja.desactualizada && !panelVisible}
          actualizadoEn={bandeja.actualizadoEn}
        />
      </section>
      <section>
        {panelVisible && detalle.conversacion ? (
          <PanelConversacion
            conversacion={detalle.conversacion}
            mensajes={detalle.mensajes}
            sujetoId={usuario?.id ?? ''}
            borrador={detalle.borrador}
            setBorrador={detalle.setBorrador}
            enviando={detalle.enviando}
            accionEnCurso={detalle.accionEnCurso}
            error={detalle.error}
            desactualizada={detalle.desactualizada || bandeja.desactualizada}
            actualizadoEn={detalle.actualizadoEn ?? bandeja.actualizadoEn}
            hayMensajesAnteriores={detalle.hayMensajesAnteriores}
            cargandoAnteriores={detalle.cargandoAnteriores}
            onCargarAnteriores={() => void detalle.cargarAnteriores()}
            onEnviar={(texto) => void detalle.enviar(texto)}
            onReclamar={() => void detalle.reclamar()}
            onDevolver={() => void detalle.devolver()}
            onAtendida={() => void detalle.atendida()}
          />
        ) : (
          <div>
            {detalle.error ? (
              detalle.error instanceof ErrorConversacionNoDisponible ? (
                <Alert variant="danger">{detalle.error.message}</Alert>
              ) : (
                <BloqueError
                  mensaje={detalle.error.message}
                  onReintentar={() => void detalle.recargar()}
                />
              )
            ) : (
              <p>{id ? 'Cargando conversación...' : 'Selecciona una conversación para leerla.'}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
