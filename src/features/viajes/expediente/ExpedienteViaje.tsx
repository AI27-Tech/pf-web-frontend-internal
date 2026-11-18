/*
 * Pantalla de descarga del expediente del viaje (E8-T17, Bloque A).
 *
 * Solo descarga el expediente de un viaje. No lista ni descarga en lote, y la
 * evidencia (Bloque C) se monta debajo. Los mensajes son de trabajo y están
 * pendientes de aprobación de Producto.
 */

import { useState, type ReactNode } from 'react';

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  Inline,
  Section,
  Stack,
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

  return <DescargaExpediente id={id} />;
}

function DescargaExpediente({ id }: { readonly id: string }) {
  const d = useDescargaExpediente(id);
  const [avisoCerrado, setAvisoCerrado] = useState(false);

  const onDescargar = () => {
    setAvisoCerrado(false);
    d.descargar();
  };

  return (
    <Stack gap={4}>
      <Card>
        <CardBody>
          <Section
            title="Descarga del expediente"
            divider
            actions={
              <BotonDescargarExpediente preparando={d.preparando} onDescargar={onDescargar} />
            }
          >
            <Stack gap={3}>
              <Inline gap={2} align="center" wrap>
                <span className="ui-text-body-sm" style={{ color: 'var(--ui-color-text-muted)' }}>
                  Incluye:
                </span>
                <Badge variant="neutral">Ficha técnica</Badge>
                <Badge variant="neutral">Bitácora</Badge>
                <Badge variant="neutral">Auditoría</Badge>
              </Inline>
              {d.esProhibido && (
                <Mensaje>
                  No tienes autorización para descargar el expediente de este viaje. Puede ser por
                  falta de permiso o porque el viaje está fuera de tu alcance.
                </Mensaje>
              )}
              {d.esNoEncontrado && (
                <Mensaje>El viaje no existe. No hay expediente que descargar.</Mensaje>
              )}
              {d.esErrorRecuperable && (
                <Mensaje>No se pudo preparar el expediente. Vuelve a intentarlo.</Mensaje>
              )}
            </Stack>
          </Section>
        </CardBody>
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
    </Stack>
  );
}

function Mensaje({ children }: { readonly children: ReactNode }) {
  return <Alert variant="danger">{children}</Alert>;
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
