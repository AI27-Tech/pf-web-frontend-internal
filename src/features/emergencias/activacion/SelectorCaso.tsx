import { Badge } from '@ai27-tech/ui';
import type { EmergenciaViaje, EstadoEmergencia } from '@/lib/contracts/emergencias';

const ETIQUETA_ESTADO: Record<EstadoEmergencia, string> = {
  abierta: 'Abierta',
  en_atencion: 'En atención',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
};

/**
 * Selector de casos del viaje. Muestra fecha y hora de activación y estado, sin notas
 * ni personal. Los casos `cerrada` ya vienen filtrados por el hook.
 */
export function SelectorCaso({
  casos,
  seleccionado,
  onSelect,
}: {
  casos: EmergenciaViaje[];
  seleccionado?: string | undefined;
  onSelect: (id: string) => void;
}) {
  if (casos.length === 0) return <p>No hay emergencias activas en este viaje.</p>;
  return (
    <div
      role="radiogroup"
      aria-label="Emergencias del viaje"
      style={{ display: 'grid', gap: 'var(--ui-space-2)' }}
    >
      {casos.map((caso) => (
        <button
          key={caso.id}
          type="button"
          aria-pressed={seleccionado === caso.id}
          onClick={() => onSelect(caso.id)}
          style={{
            textAlign: 'left',
            padding: 'var(--ui-space-2)',
            border: '1px solid var(--ui-color-border)',
            background: seleccionado === caso.id ? 'var(--ui-color-surface-raised)' : 'transparent',
          }}
        >
          <Badge variant="neutral">{ETIQUETA_ESTADO[caso.estado]}</Badge>{' '}
          <small>Activada {new Date(caso.activada_en).toLocaleString()}</small>
        </button>
      ))}
    </div>
  );
}
