/*
 * Página stub reutilizable para áreas del panel aún no implementadas.
 *
 * Cada entrada de navegación de E8-T4 debe aterrizar en una pantalla real
 * (no en un Not Found) aunque su funcionalidad llegue en historias posteriores.
 * Este componente da ese destino provisional usando SOLO estilos de @ai27-tech/ui.
 */

import { Card, PageHeader, Stack } from '@ai27-tech/ui';

interface StubPageProps {
  /** Título del área (p. ej. "Viajes"). */
  readonly titulo: string;
  /** Historia técnica que la implementará (p. ej. "E8-T7"). */
  readonly historia: string;
  /** Descripción de lo que vivirá aquí cuando se implemente. */
  readonly descripcion: string;
}

export function StubPage({ titulo, historia, descripcion }: StubPageProps) {
  return (
    <Stack gap={4}>
      <PageHeader title={titulo} description={`${historia} — Contenido pendiente`} />
      <Card variant="outlined">
        <div style={{ padding: 'var(--ui-space-4)' }}>
          <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text-muted)', margin: 0 }}>
            {descripcion}
          </p>
        </div>
      </Card>
    </Stack>
  );
}
