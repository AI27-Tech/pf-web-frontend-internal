import { Badge, Button, Card } from '@ai27-tech/ui';
import { useSession } from '@/context/SessionContext';
import { ErrorEmergenciaNoDisponible, ErrorSinAccesoEmergencias } from '@/lib/api/emergencias';
import type { EmergenciaReaccion, EstadoEmergencia } from '@/lib/contracts/emergencias';
import { BannerActualizacion } from './BannerActualizacion';
import { etiquetaResponsable } from './etiquetas';

const ETIQUETA_ESTADO: Record<EstadoEmergencia, string> = {
  abierta: 'Abierta',
  en_atencion: 'En atención',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
};

const ETIQUETA_ORIGEN: Record<EmergenciaReaccion['origen'], string> = {
  cliente: 'Cliente',
  operacion: 'Operación',
};

interface ListaCasosProps {
  items: EmergenciaReaccion[];
  seleccionado?: string | undefined;
  onSelect: (id: string) => void;
  cargando: boolean;
  cargandoMas: boolean;
  cursor: string | null;
  onMas: () => void;
  error: Error | null;
  reintentar: () => void;
  desactualizada: boolean;
  actualizadoEn: Date | null;
}

export function ListaCasos({
  items,
  seleccionado,
  onSelect,
  cargando,
  cargandoMas,
  cursor,
  onMas,
  error,
  reintentar,
  desactualizada,
  actualizadoEn,
}: ListaCasosProps) {
  const { usuario } = useSession();
  const sujetoId = usuario?.id ?? '';

  if (cargando)
    return (
      <Card variant="outlined">
        <p role="status">Cargando emergencias...</p>
      </Card>
    );
  if (error instanceof ErrorSinAccesoEmergencias || error instanceof ErrorEmergenciaNoDisponible)
    return (
      <Card variant="outlined">
        <p role="alert">No tienes acceso a la bandeja de emergencias.</p>
      </Card>
    );
  if (error && !items.length)
    return (
      <Card variant="outlined">
        <p role="alert">{error.message}</p>
        <Button onClick={reintentar}>Reintentar</Button>
      </Card>
    );

  return (
    <Card variant="outlined">
      <div style={{ display: 'grid', gap: 'var(--ui-space-2)' }}>
        <BannerActualizacion desactualizada={desactualizada} actualizadoEn={actualizadoEn} />
        {!items.length ? (
          <p>No hay emergencias activas.</p>
        ) : (
          items.map((caso) => (
            <button
              key={caso.id}
              type="button"
              onClick={() => onSelect(caso.id)}
              aria-pressed={seleccionado === caso.id}
              style={{
                textAlign: 'left',
                padding: 'var(--ui-space-3)',
                border: '1px solid var(--ui-color-border)',
                background:
                  seleccionado === caso.id ? 'var(--ui-color-surface-raised)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', gap: 'var(--ui-space-2)', flexWrap: 'wrap' }}>
                <Badge variant="neutral">{ETIQUETA_ESTADO[caso.estado]}</Badge>
                <Badge variant="neutral">{ETIQUETA_ORIGEN[caso.origen]}</Badge>
                <span>{etiquetaResponsable(caso, sujetoId)}</span>
              </div>
              <small>Activada {new Date(caso.activada_en).toLocaleString()}</small>
            </button>
          ))
        )}
        {error && items.length > 0 && <p role="alert">{error.message}</p>}
        {cursor && (
          <Button variant="outline" onClick={onMas} disabled={cargandoMas}>
            {cargandoMas ? 'Cargando...' : 'Cargar más'}
          </Button>
        )}
      </div>
    </Card>
  );
}
