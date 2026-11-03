import { Badge } from '@ai27-tech/ui';
import type { RazonCompositor } from './afordancias';

// Textos provisionales: Producto aún no los aprueba.
const TEXTO_RAZON: Record<Exclude<RazonCompositor, null>, string> = {
  en_pool: 'La conversación está en el pool.',
  reclamada_por_otro: 'La conversación está reclamada por otra persona.',
  solo_lectura: 'La conversación está en solo lectura.',
};

export function BannerEstado({
  razon,
  desactualizada,
  actualizadoEn,
}: {
  razon: RazonCompositor;
  desactualizada?: boolean;
  actualizadoEn?: Date | null;
}) {
  const texto = razon ? TEXTO_RAZON[razon] : null;
  return (
    <div aria-live="polite" style={{ display: 'flex', gap: 'var(--ui-space-2)', flexWrap: 'wrap' }}>
      {texto && <Badge variant="neutral">{texto}</Badge>}
      {desactualizada && <Badge variant="warning">La vista puede estar desactualizada.</Badge>}
      {actualizadoEn && <small>Actualizado: {actualizadoEn.toLocaleTimeString()}</small>}
    </div>
  );
}
