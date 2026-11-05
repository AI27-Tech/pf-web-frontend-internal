/*
 * Columnas y celdas de la tabla de viajes (E8-T7).
 *
 * Define las columnas `id`, `estado`, `origen` y `condiciones` para la `Table`
 * de @ai27-tech/ui. Ninguna columna es sortable: el orden lo fija el bff (P10).
 *
 * P15: el estado de progreso y las condiciones ortogonales se renderizan en
 * COLUMNAS SEPARADAS. El estado se muestra tal cual lo entrega el bff (sin
 * normalizar, Requirement 1.5); cada condición activa se muestra como un `Badge`
 * en su propia columna (Requirement 2.1–2.4). Las celdas llevan `data-testid`
 * distinguibles para verificar que una condición nunca ocupa el slot de estado.
 *
 * E8-T8: Las filas son clickeables y navegan al detalle del viaje.
 */

import { Badge } from '@ai27-tech/ui';
import type { BadgeVariant, Column } from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';

import { CondicionViaje } from '@/lib/contracts/viajes';
import type { ViajeVista } from './viajeVista';

/**
 * Variante de `Badge` por condición. Cubre el enum `CondicionViaje` completo
 * (procedencia: @ai27-tech/contracts). P15: la condición NUNCA sustituye al
 * estado; esto solo elige su presentación visual.
 */
export const VARIANTE_CONDICION: Record<CondicionViaje, BadgeVariant> = {
  [CondicionViaje.Incidencia]: 'alert',
  [CondicionViaje.SinSenal]: 'warning',
};

/**
 * Factory que retorna las columnas de la tabla de viajes con navegación integrada.
 *
 * Las columnas dependen del contexto de navegación (useNavigate), así que se
 * generan dentro de un hook en el componente padre (BandejaViajes).
 */
export function obtenerColumnasViaje(
  navigate: ReturnType<typeof useNavigate>,
): Column<ViajeVista>[] {
  return [
    {
      key: 'id',
      header: 'Viaje',
      accessor: 'id',
      cell: (v) => (
        <button
          onClick={() => {
            void navigate({
              to: '/viajes/$id',
              params: { id: v.id },
            });
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ui-color-primary)',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0,
            font: 'inherit',
          }}
          title="Ver detalle del viaje"
        >
          {v.id}
        </button>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: (v) => (
        <Badge data-testid="estado" variant="neutral">
          {v.estado}
        </Badge>
      ),
    },
    { key: 'origen', header: 'Origen', accessor: 'origen' },
    {
      key: 'condiciones',
      header: 'Condiciones',
      cell: (v) => (
        <span
          data-testid="condiciones"
          style={{ display: 'inline-flex', gap: 'var(--ui-space-1)' }}
        >
          {(v.condiciones_activas ?? []).map((c) => (
            <Badge key={c} variant={VARIANTE_CONDICION[c]} dot>
              {c}
            </Badge>
          ))}
        </span>
      ),
    },
  ];
}
