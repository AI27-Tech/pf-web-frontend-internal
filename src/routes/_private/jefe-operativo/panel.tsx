/*
 * Panel del Jefe Operativo — E8-T20
 * Stub temporal que será reemplazado con la implementación real.
 *
 * Usa SOLO estilos de @ai27-tech/ui.
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Card, Section, Stack } from '@ai27-tech/ui';
import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { BandejaSolicitudes } from '@/features/solicitudes/BandejaSolicitudes';

export const Route = createFileRoute('/_private/jefe-operativo/panel')({
  component: JefeOperativoPanelRoute,
});

function JefeOperativoPanelRoute() {
  return (
    <RequiereCapacidad capacidad="panel.jefeOperativo">
      <JefeOperativoPanelPage />
    </RequiereCapacidad>
  );
}

function JefeOperativoPanelPage() {
  const navigate = useNavigate();
  return (
    <Stack gap={4}>
      <h1
        className="ui-text-headline-lg"
        style={{
          margin: 0,
          color: 'var(--ui-color-text)',
        }}
      >
        Panel del Jefe Operativo
      </h1>
      <p
        style={{
          fontSize: 'var(--ui-font-size-sm)',
          color: 'var(--ui-color-text-muted)',
          margin: 0,
        }}
      >
        E8-T20 — Contenido pendiente
      </p>
      <Card variant="outlined">
        <div
          style={{
            padding: 'var(--ui-space-4)',
          }}
        >
          <p
            className="ui-text-body-sm"
            style={{
              color: 'var(--ui-color-text-muted)',
              margin: 0,
            }}
          >
            Aquí irán: roster de unidades, asignación de viajes, cierre de viajes.
          </p>
        </div>
      </Card>
      <Section
        title="Solicitudes por aprobar"
        description="Solicitudes pagadas que esperan tu decisión."
      >
        <BandejaSolicitudes
          onAbrir={(id) =>
            void navigate({
              to: '/solicitudes',
              search: { id, vista: undefined, conversacion: undefined },
            })
          }
        />
      </Section>
    </Stack>
  );
}
