// BRECHA-UI: Stat no admite insignia de estado ni pie de texto; se compone Card, Stat, Badge e Inline (BRECHAS-UI #6).
import type { ReactNode } from 'react';

import { Card, CardBody, Inline, SkeletonText, Stack, Stat } from '@ai27-tech/ui';

export interface TarjetaKpiProps {
  /** Icono de `lucide-react`, que `Stat` muestra como decoración. */
  readonly icono: ReactNode;
  readonly etiqueta: string;
  readonly valor: ReactNode;
  /** Unidad atenuada junto a la cifra, p. ej. «viajes». */
  readonly unidad?: string | undefined;
  /** Una o dos frases cortas. */
  readonly pie: string;
  /** Insignia de estado. Solo se pasa cuando el dato tiene un estado real. */
  readonly insignia?: ReactNode | undefined;
  readonly cargando?: boolean;
}

export function TarjetaKpi({
  icono,
  etiqueta,
  valor,
  unidad,
  pie,
  insignia,
  cargando = false,
}: TarjetaKpiProps) {
  return (
    <Card variant="outlined">
      <CardBody>
        <Stack gap={3}>
          {!cargando && insignia && (
            <Inline justify="end" align="center">
              {insignia}
            </Inline>
          )}
          <Stat
            label={etiqueta}
            icon={icono}
            loading={cargando}
            value={
              <>
                {valor}
                {unidad && <span className="ui-text-body-sm"> {unidad}</span>}
              </>
            }
            helpText={cargando ? <SkeletonText lines={1} /> : pie}
          />
        </Stack>
      </CardBody>
    </Card>
  );
}
