/*
 * Solicitudes (M14): bandeja y detalle bajo una sola ruta. La solicitud abierta viaja en la URL
 * (`?id=`), así una liga directa abre el detalle. Aquí viven los avisos efímeros de las acciones.
 */
import { useRef, useState } from 'react';
import { Button, Inline, PageHeader, Stack, Toast, ToastContainer } from '@ai27-tech/ui';
import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { useSession } from '@/context/SessionContext';
import { puede } from '@/lib/permisos';
import { BandejaConversacionesBase } from '../conversaciones/BandejaConversaciones';
import { veDatosComerciales } from './afordancias';
import { BandejaSolicitudes } from './BandejaSolicitudes';
import { DetalleSolicitud } from './DetalleSolicitud';

export type VistaSolicitudes = 'solicitudes' | 'conversaciones';

interface SolicitudesProps {
  /** Solicitud abierta; `null` muestra la bandeja. */
  readonly id: string | null;
  /** Bandeja de solicitudes o conversaciones de solicitud (cotizacion y administrador). */
  readonly vista?: VistaSolicitudes;
  /** Conversación abierta en la vista de conversaciones. */
  readonly conversacion?: string | undefined;
  readonly onCambiarVista?: (vista: VistaSolicitudes) => void;
  readonly onSeleccionarConversacion?: (id: string) => void;
  readonly onAbrir: (id: string) => void;
  readonly onVolver: () => void;
  readonly onVerViaje: (id: string) => void;
}

interface Aviso {
  readonly id: number;
  readonly texto: string;
  readonly tipo: 'exito' | 'error';
}

export function Solicitudes({
  id,
  vista = 'solicitudes',
  conversacion,
  onAbrir,
  onVolver,
  onVerViaje,
  onCambiarVista,
  onSeleccionarConversacion,
}: SolicitudesProps) {
  const { usuario } = useSession();
  const comercial = veDatosComerciales(usuario?.rol);
  const conversa = puede(usuario?.rol, 'solicitud.conversacion');
  const [avisos, setAvisos] = useState<readonly Aviso[]>([]);
  const contador = useRef(0);

  const aviso = (texto: string, tipo: 'exito' | 'error') => {
    if (!texto) return;
    contador.current += 1;
    const nuevo = { id: contador.current, texto, tipo };
    setAvisos((previos) => [...previos, nuevo]);
  };

  return (
    <Stack gap={4}>
      {conversa && id === null && (
        <Inline gap={2} as="nav" aria-label="Vistas de solicitudes">
          <Button
            variant={vista === 'solicitudes' ? 'primary' : 'outline'}
            aria-current={vista === 'solicitudes' ? 'page' : undefined}
            onClick={() => onCambiarVista?.('solicitudes')}
          >
            Solicitudes
          </Button>
          <Button
            variant={vista === 'conversaciones' ? 'primary' : 'outline'}
            aria-current={vista === 'conversaciones' ? 'page' : undefined}
            onClick={() => onCambiarVista?.('conversaciones')}
          >
            Conversaciones
          </Button>
        </Inline>
      )}
      {vista === 'conversaciones' ? (
        // Los hooks de datos de la conversación viven dentro de la guarda: otro rol no pide nada.
        <RequiereCapacidad capacidad="solicitud.conversacion">
          <BandejaConversacionesBase
            origen="solicitud"
            conversacionId={conversacion}
            onSeleccionar={(abierta) => onSeleccionarConversacion?.(abierta)}
          />
        </RequiereCapacidad>
      ) : id === null ? (
        <>
          <PageHeader
            title="Solicitudes"
            description={
              comercial
                ? 'Cotiza, confirma pagos y reprograma las solicitudes de los clientes.'
                : 'Solicitudes pagadas que esperan tu aprobación.'
            }
          />
          <BandejaSolicitudes onAbrir={onAbrir} />
        </>
      ) : (
        <DetalleSolicitud id={id} onVolver={onVolver} onAviso={aviso} onVerViaje={onVerViaje} />
      )}{' '}
      <ToastContainer position="bottom-right">
        {avisos.map((item) => (
          <Toast
            key={item.id}
            variant={item.tipo === 'exito' ? 'success' : 'error'}
            duration={6000}
            onClose={() =>
              setAvisos((previos) => previos.filter((previo) => previo.id !== item.id))
            }
          >
            {item.texto}
          </Toast>
        ))}
      </ToastContainer>
    </Stack>
  );
}
