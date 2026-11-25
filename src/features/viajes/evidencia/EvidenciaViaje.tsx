/*
 * Evidencia del viaje (E8-T17, Bloque C). Estado: preparada, no terminada. Se construye
 * contra el contrato y no se da por funcional de punta a punta: el almacén del backend
 * de V1 es un marcador (Requirement 5.16). Por eso la sección avisa al usuario.
 */

import { Alert, Card, CardBody, Section, Stack } from '@ai27-tech/ui';

import { useSession } from '@/context/SessionContext';
import { ErrorAdjuntosProhibido } from '@/lib/api/adjuntos';
import { ErrorViajeInexistente } from '@/lib/api/expediente';
import { puede } from '@/lib/permisos';

import { ListaAdjuntos } from './ListaAdjuntos';
import { SubirEvidencia } from './SubirEvidencia';
import { useEvidenciaViaje } from './useEvidenciaViaje';

export interface EvidenciaViajeProps {
  readonly id: string;
}

export function EvidenciaViaje({ id }: EvidenciaViajeProps) {
  const { usuario } = useSession();

  // Listar, descargar y subir evidencia comparten `monitoreo.consultar` (M7, 8.2 y 8.3). Sin ella
  // la sección no se monta y no se pide la lista.
  if (!puede(usuario?.rol, 'monitoreo.consultar')) return null;

  return <EvidenciaAutorizada id={id} />;
}

/** Aviso de un fallo de descarga: un 403 no se arregla reintentando y un 404 no sugiere permisos. */
function mensajeErrorDescarga(error: Error): string {
  if (error instanceof ErrorAdjuntosProhibido) {
    return 'No tienes permiso para descargar este adjunto.';
  }
  if (error instanceof ErrorViajeInexistente) return 'Viaje no encontrado.';
  return 'No se pudo descargar el adjunto. Vuelve a intentarlo.';
}

function EvidenciaAutorizada({ id }: { readonly id: string }) {
  const e = useEvidenciaViaje(id);

  return (
    <Card>
      <CardBody>
        <Section title="Evidencia del viaje" divider>
          <Stack gap={4}>
            <Alert variant="warning">
              El almacén de evidencia de V1 todavía está en preparación. Lo que subas aquí puede no
              quedar disponible.
            </Alert>
            <ListaAdjuntos
              adjuntos={e.adjuntos}
              cargando={e.cargando}
              error={e.error}
              reintentar={e.reintentar}
              onDescargar={e.descargar}
              descargando={e.descargando}
            />
            {e.errorDescarga && (
              <Alert variant="danger">{mensajeErrorDescarga(e.errorDescarga)}</Alert>
            )}
            <SubirEvidencia subiendo={e.subiendo} error={e.errorSubida} onSubir={e.subir} />
          </Stack>
        </Section>
      </CardBody>
    </Card>
  );
}
