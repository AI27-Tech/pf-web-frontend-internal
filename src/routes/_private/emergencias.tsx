/*
 * Bandeja de Emergencias — E7-T1
 * Stub temporal que será reemplazado con la implementación real.
 *
 * Usa SOLO estilos de @ai27-tech/ui.
 */

import { createFileRoute } from '@tanstack/react-router';
import { Card } from '@ai27-tech/ui';

export const Route = createFileRoute('/_private/emergencias')({
  component: EmergenciasPage,
});

function EmergenciasPage() {
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
        Bandeja de Emergencias
      </h1>
      <p
        style={{
          fontSize: 'var(--ui-font-size-sm)',
          color: 'var(--ui-color-text-muted)',
          margin: 0,
        }}
      >
        E7-T1 — Contenido pendiente
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
            Aquí irán: casos de emergencia activos, acciones de respuesta, historial de incidentes.
          </p>
        </div>
      </Card>
    </div>
  );
}
