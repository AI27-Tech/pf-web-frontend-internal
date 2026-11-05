/*
 * Evidencia del viaje (E8-T17, Bloque C). Estado: preparada, no terminada. Se construye
 * contra el contrato y no se da por funcional de punta a punta: el almacén del backend
 * de V1 es un marcador (Requirement 5.16).
 */

import { Card, CardBody, CardHeader } from '@ai27-tech/ui';

import { useSession } from '@/context/SessionContext';
import { puedeUsarMonitoreo } from '@/features/monitoreo/puedeUsarMonitoreo';

import { ListaAdjuntos } from './ListaAdjuntos';
import { SubirEvidencia } from './SubirEvidencia';
import { useEvidenciaViaje } from './useEvidenciaViaje';

export interface EvidenciaViajeProps {
  readonly id: string;
}

export function EvidenciaViaje({ id }: EvidenciaViajeProps) {
  const { usuario } = useSession();

  if (!usuario || !puedeUsarMonitoreo(usuario.rol)) return null;

  return <EvidenciaAutorizada id={id} />;
}

function EvidenciaAutorizada({ id }: { readonly id: string }) {
  const e = useEvidenciaViaje(id);

  return (
    <Card>
      <CardHeader>
        <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
          Evidencia del viaje
        </p>
      </CardHeader>
      <CardBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4)' }}>
          <ListaAdjuntos
            adjuntos={e.adjuntos}
            cargando={e.cargando}
            error={e.error}
            reintentar={e.reintentar}
            onDescargar={e.descargar}
            descargando={e.descargando}
          />
          <SubirEvidencia subiendo={e.subiendo} error={e.errorSubida} onSubir={e.subir} />
        </div>
      </CardBody>
    </Card>
  );
}
