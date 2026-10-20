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
 */

import { Badge } from '@ai27-tech/ui';
import type { BadgeVariant, Column } from '@ai27-tech/ui';

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

/** Columnas de la tabla de viajes. No sortables: el orden lo fija el bff (P10). */
export const columnasViaje: Column<ViajeVista>[] = [
  { key: 'id', header: 'Viaje', accessor: 'id' },
  {
    key: 'estado',
    header: 'Estado',
    // El estado se muestra literal, tal cual lo entrega el bff (Requirement 1.5).
    cell: (v) => <span data-testid="estado">{v.estado}</span>,
  },
  { key: 'origen', header: 'Origen', accessor: 'origen' },
  {
    key: 'condiciones',
    header: 'Condiciones',
    // Columna separada del estado (P15). Un Badge por condición activa; vacío si
    // no hay. Brecha V1: `condiciones_activas` no viene del bff hoy, así que esta
    // celda renderiza vacío hasta que el contrato las publique (ver viajeVista.ts).
    cell: (v) => (
      <span data-testid="condiciones" style={{ display: 'inline-flex', gap: 'var(--ui-space-1)' }}>
        {(v.condiciones_activas ?? []).map((c) => (
          <Badge key={c} variant={VARIANTE_CONDICION[c]} dot>
            {c}
          </Badge>
        ))}
      </span>
    ),
  },
];
