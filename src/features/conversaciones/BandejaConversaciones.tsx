import { useNavigate, useSearch } from '@tanstack/react-router';
import { Alert, Grid, PageHeader, SkeletonText } from '@ai27-tech/ui';
import { BloqueError } from '@/components/feedback/BloqueError';
import { ErrorConversacionNoDisponible } from '@/lib/api/conversaciones';
import { useSession } from '@/context/SessionContext';
import { puede } from '@/lib/permisos';
import { useTrabajoBandeja, type OrigenConversaciones } from './useTrabajoBandeja';
import { useNombresCliente } from './useNombresCliente';
import { useConversacion } from './useConversacion';
import { ListaTrabajo } from './ListaTrabajo';
import { PanelConversacion } from './PanelConversacion';

/**
 * Bandeja de conversaciones del viaje (`ejecutivo`; SUP y COO en solo lectura). La conversación
 * abierta viaja en `?conversacion=` de `/conversaciones`.
 */
export function BandejaConversaciones() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/_private/conversaciones' });
  const seleccionar = (next: string) =>
    void (navigate as unknown as (options: { search: Record<string, string> }) => Promise<void>)({
      search: { conversacion: next },
    });
  return (
    <BandejaConversacionesBase
      origen="viaje"
      conversacionId={search.conversacion}
      onSeleccionar={seleccionar}
    />
  );
}

interface BandejaConversacionesBaseProps {
  /** De dónde sale el trabajo: el viaje (`ejecutivo`) o la solicitud (`cotizacion`). */
  readonly origen: OrigenConversaciones;
  readonly conversacionId: string | undefined;
  readonly onSeleccionar: (id: string) => void;
  /** Oculta el `PageHeader` propio cuando la página ya pone su encabezado (solicitudes). */
  readonly sinEncabezado?: boolean;
}

/**
 * Bandeja y panel de conversación, sin saber de rutas. Lo usan el viaje (`/conversaciones`) y la
 * solicitud (`/solicitudes?vista=conversaciones`): el reclamo, la respuesta y la lectura son el
 * mismo mecanismo (DEC-148 #31). Qué rol opera lo decide la capacidad de cada origen.
 */
export function BandejaConversacionesBase({
  origen,
  conversacionId: id,
  onSeleccionar: seleccionar,
  sinEncabezado = false,
}: BandejaConversacionesBaseProps) {
  const { usuario } = useSession();
  const bandeja = useTrabajoBandeja(origen);
  // cotizacion no lista clientes (403): sus conversaciones muestran el id del cliente.
  const nombres = useNombresCliente(origen === 'viaje' || puede(usuario?.rol, 'clientes.listar'));
  const detalle = useConversacion(id);
  const capacidadOperar = origen === 'solicitud' ? 'solicitud.conversacion' : 'conversacion.operar';
  // Transferir solo existe en la solicitud: el destino es el id del sujeto (DEC-148 #74). En el
  // viaje sería el `sub` del destinatario, que el panel no conoce (DT-28).
  const puedeTransferir = origen === 'solicitud' && puede(usuario?.rol, 'solicitud.transferir');
  const panelVisible = Boolean(detalle.conversacion && !detalle.cargando);
  return (
    <Grid gap={4} style={{ gridTemplateColumns: 'minmax(18rem, 32rem) minmax(0, 1fr)' }}>
      <section>
        {!sinEncabezado && (
          <PageHeader
            title={
              origen === 'solicitud' ? 'Conversaciones de solicitudes' : 'Bandeja de conversaciones'
            }
          />
        )}
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
            soloLectura={!puede(usuario?.rol, capacidadOperar)}
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
            {...(puedeTransferir ? { onTransferir: detalle.transferir } : {})}
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
            ) : id ? (
              <div role="status" aria-label="Cargando conversación">
                <SkeletonText lines={4} />
              </div>
            ) : (
              <p>Selecciona una conversación para leerla.</p>
            )}
          </div>
        )}
      </section>
    </Grid>
  );
}
