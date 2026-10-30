/*
 * Dashboard de Monitoreo — E8-T17
 * Stub temporal que será reemplazado con la implementación real.
 *
 * Usa SOLO estilos de @ai27-tech/ui.
 */

import { createFileRoute } from '@tanstack/react-router';
import { Card } from '@ai27-tech/ui';

export const Route = createFileRoute('/_private/monitoreo/dashboard')({
  component: MonitoreoDashboardPage,
});

function MonitoreoDashboardPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ui-space-4)',
      }}
    >
      <h1
        className="ui-text-headline-lg"
        style={{
          margin: 0,
          color: 'var(--ui-color-text)',
        }}
      >
        Dashboard de Monitoreo
      </h1>
      <p
        style={{
          fontSize: 'var(--ui-font-size-sm)',
          color: 'var(--ui-color-text-muted)',
          margin: 0,
        }}
      >
        E8-T17 — Contenido pendiente
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
            Aquí irán: lista de viajes monitoreados, transiciones de estado, condiciones activas
            (incidencia, sin_senal).
          </p>
        </div>
      </Card>
    </div>
  );
}
