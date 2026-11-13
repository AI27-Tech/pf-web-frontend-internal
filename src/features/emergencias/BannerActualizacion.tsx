import { Badge, Inline } from '@ai27-tech/ui';

/**
 * Indica la última consulta correcta. Si la última falló, muestra que la vista puede
 * estar desactualizada. Los datos mostrados se conservan (Req 10.4).
 */
export function BannerActualizacion({
  desactualizada,
  actualizadoEn,
}: {
  desactualizada: boolean;
  actualizadoEn: Date | null;
}) {
  if (!actualizadoEn && !desactualizada) return null;
  const hora = actualizadoEn ? actualizadoEn.toLocaleTimeString() : null;
  return (
    <Inline gap={2} align="center" wrap={false}>
      {hora && <small>Actualizado a las {hora}</small>}
      {desactualizada && <Badge variant="warning">La vista puede estar desactualizada.</Badge>}
    </Inline>
  );
}
