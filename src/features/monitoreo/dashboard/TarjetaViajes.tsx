import {
  Badge,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Inline,
  Pagination,
  Stack,
  Table,
  type Column,
} from '@ai27-tech/ui';
import { ClipboardList } from 'lucide-react';
import type { ReactNode } from 'react';

import type { FilaViaje } from '@/lib/contracts/reportes';

import { badgeDeEstado } from './estadoBadge';
import { TAMANOS_PAGINA, paginar } from './paginar';

export interface TarjetaViajesProps {
  /** Filas completas, en el orden del `bff`. `null` mientras carga. */
  readonly filas: readonly FilaViaje[] | null;
  /** Página ya ajustada al rango válido (base 1). */
  readonly pagina: number;
  readonly tamano: number;
  readonly onPaginaChange: (pagina: number) => void;
  readonly onTamanoChange: (tamano: number) => void;
  /** Enlace «Ver todos los viajes». */
  readonly enlaceVerTodos?: ReactNode;
}

function formatearFechaHora(valor: string | null | undefined): string {
  return valor ? new Date(valor).toLocaleString('es-MX') : '—';
}

function columnasViajes(): Column<FilaViaje>[] {
  return [
    {
      key: 'viaje',
      header: 'Viaje',
      cell: (fila) => <strong>{fila.viaje_id}</strong>,
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: (fila) => {
        const descriptor = badgeDeEstado(fila.estado);
        return (
          <Badge
            dot={descriptor.dot}
            variant={descriptor.variant}
            appearance={descriptor.appearance}
            pulse={descriptor.pulse}
          >
            {fila.estado}
          </Badge>
        );
      },
    },
    {
      key: 'creado',
      header: 'Creado',
      cell: (fila) => <span className="ui-text-body-sm">{formatearFechaHora(fila.creado_en)}</span>,
    },
    {
      key: 'cerrado',
      header: 'Cerrado',
      cell: (fila) => (
        <span className="ui-text-body-sm">{formatearFechaHora(fila.cerrado_en)}</span>
      ),
    },
  ];
}

/** Tarjeta de la tabla de viajes con encabezado, paginación en cliente y enlace a la bandeja. */
export function TarjetaViajes({
  filas,
  pagina,
  tamano,
  onPaginaChange,
  onTamanoChange,
  enlaceVerTodos,
}: TarjetaViajesProps) {
  const total = filas?.length ?? 0;
  const visibles = filas ? paginar(filas, pagina, tamano) : [];
  const mostrarPaginacion = total > TAMANOS_PAGINA[0];

  return (
    <Card variant="outlined">
      <CardHeader
        title="Viajes"
        subtitle="Filas del reporte, en el orden que entrega el servicio"
        media={<ClipboardList size={16} aria-hidden="true" />}
      />
      <CardBody>
        <Stack gap={4}>
          <Table<FilaViaje>
            aria-label="Viajes del reporte"
            data={visibles}
            rowKey={(fila) => fila.viaje_id}
            columns={columnasViajes()}
            hoverable
            stickyHeader
            loading={filas === null}
            loadingRows={tamano}
          />
          {mostrarPaginacion && (
            <Pagination
              page={pagina}
              pageSize={tamano}
              total={total}
              onPageChange={onPaginaChange}
              onPageSizeChange={onTamanoChange}
              pageSizeOptions={[...TAMANOS_PAGINA]}
              showInfo
            />
          )}
        </Stack>
      </CardBody>
      {enlaceVerTodos && (
        <CardFooter>
          <Inline justify="end" align="center">
            {enlaceVerTodos}
          </Inline>
        </CardFooter>
      )}
    </Card>
  );
}
