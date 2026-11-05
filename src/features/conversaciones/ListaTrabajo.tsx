import { Badge, Button, Card } from '@ai27-tech/ui';
import { ErrorSinAcceso, ErrorSinBandeja } from '@/lib/api/conversaciones';
import type { Conversacion } from '@/lib/contracts/conversaciones';
import { capacidades } from './afordancias';
import { BannerEstado } from './BannerEstado';

export function ListaTrabajo({
  items,
  sujetoId,
  nombres,
  seleccionada,
  onSelect,
  onMas,
  hayMas,
  cargando,
  cargandoMas,
  error,
  reintentar,
  desactualizada = false,
  actualizadoEn = null,
}: {
  items: Conversacion[];
  sujetoId: string;
  nombres: Record<string, string>;
  seleccionada?: string;
  onSelect: (id: string) => void;
  onMas: () => void;
  hayMas: boolean;
  cargando: boolean;
  cargandoMas: boolean;
  error: Error | null;
  reintentar: () => void;
  /**
   * La falla de polling de la bandeja se avisa aquí solo cuando no hay panel de
   * conversación abierto; con el panel abierto lo avisa su `BannerEstado` (Req 11.5).
   */
  desactualizada?: boolean;
  actualizadoEn?: Date | null;
}) {
  if (cargando)
    return (
      <Card variant="outlined">
        <p role="status">Cargando conversaciones...</p>
      </Card>
    );
  if (error instanceof ErrorSinBandeja)
    return (
      <Card variant="outlined">
        <p role="status">No tienes una bandeja asignada.</p>
      </Card>
    );
  if (error instanceof ErrorSinAcceso)
    return (
      <Card variant="outlined">
        <p role="alert">No tienes autorización para esta bandeja.</p>
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
        <BannerEstado
          razon={null}
          desactualizada={desactualizada}
          actualizadoEn={desactualizada ? actualizadoEn : null}
        />
        {!items.length ? (
          <p>La bandeja no tiene conversaciones.</p>
        ) : (
          items.map((item) => {
            const c = capacidades(item, sujetoId);
            const estado = !item.reclamo_activo
              ? 'En el pool'
              : c.puedeResponder
                ? 'Tuya'
                : 'Otra persona';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-pressed={seleccionada === item.id}
                style={{
                  textAlign: 'left',
                  padding: 'var(--ui-space-3)',
                  border: '1px solid var(--ui-color-border)',
                  background:
                    seleccionada === item.id ? 'var(--ui-color-surface-raised)' : 'transparent',
                }}
              >
                <strong>{nombres[item.cliente_id] ?? 'Cliente no disponible'}</strong>
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--ui-space-2)',
                    marginTop: 'var(--ui-space-1)',
                  }}
                >
                  <Badge variant={c.puedeResponder ? 'secure' : 'neutral'}>{estado}</Badge>
                  {item.atendida_en && <Badge variant="secure">Atendida</Badge>}
                  <small>{new Date(item.abierta_en).toLocaleString()}</small>
                </div>
              </button>
            );
          })
        )}
        {error && items.length > 0 && <p role="alert">{error.message}</p>}
        {hayMas && (
          <Button variant="outline" onClick={onMas} disabled={cargandoMas}>
            {cargandoMas ? 'Cargando...' : 'Cargar más'}
          </Button>
        )}
      </div>
    </Card>
  );
}
