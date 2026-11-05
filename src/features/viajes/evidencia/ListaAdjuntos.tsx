import { Badge, Button, Card, CardBody, CardFooter, CardHeader, Table } from '@ai27-tech/ui';

import type { Adjunto, EstadoEscaneo } from '@/lib/contracts/adjuntos';

import { esDescargable } from './adjuntoDescargable';

export interface ListaAdjuntosProps {
  readonly adjuntos: readonly Adjunto[];
  readonly cargando: boolean;
  readonly error: Error | null;
  readonly reintentar: () => void;
  readonly onDescargar: (adjunto: Adjunto) => void;
  readonly descargando: boolean;
}

const ETIQUETA_ESCANEO: Record<EstadoEscaneo, string> = {
  pendiente: 'Escaneo pendiente',
  limpio: 'Limpio',
  infectado: 'Infectado',
};

const VARIANTE_ESCANEO: Record<EstadoEscaneo, 'warning' | 'secure' | 'alert'> = {
  pendiente: 'warning',
  limpio: 'secure',
  infectado: 'alert',
};

/** Tamaño legible en unidades binarias. Solo presentación; no fija ningún límite. */
function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Lista de evidencia del viaje. No muestra el autor: queda fuera de V1 (DT-11). */
export function ListaAdjuntos({
  adjuntos,
  cargando,
  error,
  reintentar,
  onDescargar,
  descargando,
}: ListaAdjuntosProps) {
  if (error) {
    return (
      <Card variant="outlined">
        <CardBody>
          <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
            No se pudo cargar la evidencia del viaje.
          </p>
        </CardBody>
        <CardFooter>
          <Button variant="primary" type="button" onClick={reintentar}>
            Reintentar
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (cargando) {
    return (
      <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}>
        Cargando la evidencia...
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
          Evidencia del viaje
        </p>
      </CardHeader>
      <CardBody>
        <Table<Adjunto>
          aria-label="Evidencia del viaje"
          data={[...adjuntos]}
          rowKey={(adjunto) => adjunto.id}
          density="compact"
          emptyState={
            <p
              className="ui-text-body-sm"
              style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}
            >
              Sin evidencia
            </p>
          }
          columns={[
            { key: 'nombre', header: 'Nombre', accessor: 'nombre' },
            { key: 'tipo', header: 'Tipo de medio', accessor: 'tipo_medio' },
            {
              key: 'tamano',
              header: 'Tamaño',
              cell: (adjunto: Adjunto) => formatearTamano(adjunto.tamano_bytes),
            },
            {
              key: 'escaneo',
              header: 'Escaneo',
              cell: (adjunto: Adjunto) => (
                <Badge variant={VARIANTE_ESCANEO[adjunto.estado_escaneo]}>
                  {ETIQUETA_ESCANEO[adjunto.estado_escaneo]}
                </Badge>
              ),
            },
            {
              key: 'creado',
              header: 'Creado',
              cell: (adjunto: Adjunto) => new Date(adjunto.creado_en).toLocaleString('es-MX'),
            },
            {
              key: 'accion',
              header: '',
              cell: (adjunto: Adjunto) =>
                esDescargable(adjunto.estado_escaneo) ? (
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={descargando}
                    onClick={() => onDescargar(adjunto)}
                  >
                    Descargar
                  </Button>
                ) : null,
            },
          ]}
        />
      </CardBody>
    </Card>
  );
}
