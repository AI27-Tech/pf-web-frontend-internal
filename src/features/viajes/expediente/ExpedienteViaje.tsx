/*
 * Pantalla de descarga del expediente del viaje (E8-T17, Bloque A).
 *
 * Solo descarga el expediente de un viaje. No lista ni descarga en lote, y no
 * monta la evidencia (Bloque C). Los mensajes son de trabajo y están pendientes
 * de aprobación de Producto.
 */

import { useState, type ReactNode } from 'react';

import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Toast,
  ToastContainer,
} from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';

import { useSession } from '@/context/SessionContext';
import { puedeUsarMonitoreo } from '@/features/monitoreo/puedeUsarMonitoreo';

import { EvidenciaViaje } from '@/features/viajes/evidencia/EvidenciaViaje';

import { BotonDescargarExpediente } from './BotonDescargarExpediente';
import { useDescargaExpediente } from './useDescargaExpediente';

export interface ExpedienteViajeProps {
  readonly id: string;
}

export function ExpedienteViaje({ id }: ExpedienteViajeProps) {
  const { usuario } = useSession();
  const navigate = useNavigate();
  const onVolver = () => void navigate({ to: '/viajes/$id', params: { id } });

  if (!usuario || !puedeUsarMonitoreo(usuario.rol)) {
    return <AccesoNoAutorizado onVolver={onVolver} />;
  }

  return <DescargaExpediente id={id} onVolver={onVolver} />;
}

function DescargaExpediente({
  id,
  onVolver,
}: {
  readonly id: string;
  readonly onVolver: () => void;
}) {
  const d = useDescargaExpediente(id);
  const [avisoCerrado, setAvisoCerrado] = useState(false);

  const onDescargar = () => {
    setAvisoCerrado(false);
    d.descargar();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--ui-space-3)',
        }}
      >
        <div>
          <h1 className="ui-text-headline-lg" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
            Expediente del viaje
          </h1>
          <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}>
            Viaje: {id}
          </p>
        </div>
        <Button variant="secondary" type="button" onClick={onVolver}>
          Volver al detalle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
            Descarga del expediente
          </p>
        </CardHeader>
        <CardBody>
          <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
            Descarga el expediente completo del viaje: ficha técnica, bitácora y auditoría.
          </p>
          {d.esProhibido && (
            <Mensaje>
              No tienes autorización para descargar el expediente de este viaje. Puede ser por falta
              de permiso o porque el viaje está fuera de tu alcance.
            </Mensaje>
          )}
          {d.esNoEncontrado && (
            <Mensaje>El viaje no existe. No hay expediente que descargar.</Mensaje>
          )}
          {d.esErrorRecuperable && (
            <Mensaje>No se pudo preparar el expediente. Vuelve a intentarlo.</Mensaje>
          )}
        </CardBody>
        <CardFooter>
          <BotonDescargarExpediente preparando={d.preparando} onDescargar={onDescargar} />
        </CardFooter>
      </Card>

      <EvidenciaViaje id={id} />

      <ToastContainer position="top-right">
        {d.exito && !avisoCerrado && (
          <Toast
            variant="success"
            title="Expediente descargado"
            onClose={() => setAvisoCerrado(true)}
          />
        )}
      </ToastContainer>
    </div>
  );
}

function Mensaje({ children }: { readonly children: ReactNode }) {
  return (
    <p
      className="ui-text-body-sm"
      role="alert"
      style={{ margin: 'var(--ui-space-2) 0 0', color: 'var(--ui-color-text)' }}
    >
      {children}
    </p>
  );
}

function AccesoNoAutorizado({ onVolver }: { readonly onVolver: () => void }) {
  return (
    <Card variant="outlined">
      <CardBody>
        <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
          Este expediente no está disponible para tu rol.
        </p>
      </CardBody>
      <CardFooter>
        <Button variant="secondary" type="button" onClick={onVolver}>
          Volver al detalle
        </Button>
      </CardFooter>
    </Card>
  );
}
