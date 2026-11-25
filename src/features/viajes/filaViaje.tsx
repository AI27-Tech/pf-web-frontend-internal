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
import { Link } from '@tanstack/react-router';

import { badgeDeEstado } from '@/features/monitoreo/dashboard/estadoBadge';
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

/** Nombre del cliente; si falta, su id; sin cliente, un guion. */
export function textoCliente(v: ViajeVista): string {
  return v.cliente ? (v.cliente.nombre ?? v.cliente.id) : '—';
}

/** Económicos de la escolta (o el id si falta); sin unidades, "Sin escolta". */
export function textoEscolta(v: ViajeVista): string {
  return v.unidades.length > 0
    ? v.unidades.map((u) => u.economico ?? u.id).join(', ')
    : 'Sin escolta';
}

/**
 * Factory que retorna las columnas de la tabla de viajes con navegación integrada.
 *
 * Las columnas dependen del contexto de navegación (useNavigate), así que se
 * generan dentro de un hook en el componente padre (BandejaViajes).
 */
export function obtenerColumnasViaje(): Column<ViajeVista>[] {
  return [
    { key: 'id', header: 'Viaje', cell: (v) => <strong>{v.id}</strong> },
    {
      key: 'cliente',
      header: 'Cliente',
      cell: (v) => <span data-testid="cliente">{textoCliente(v)}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: (v) => {
        // Mismo mapa estado a Badge que el dashboard de monitorista (ESTADO_BADGE).
        const descriptor = badgeDeEstado(v.estado);
        return (
          <Badge
            data-testid="estado"
            dot={descriptor.dot}
            variant={descriptor.variant}
            appearance={descriptor.appearance}
            pulse={descriptor.pulse}
          >
            {v.estado}
          </Badge>
        );
      },
    },
    { key: 'origen', header: 'Origen', accessor: 'origen' },
    {
      key: 'escolta',
      header: 'Escolta',
      cell: (v) => <span data-testid="escolta">{textoEscolta(v)}</span>,
    },
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
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      cell: (v) => (
        <Link
          to="/viajes/$id"
          params={{ id: v.id }}
          aria-label={`Detalles del viaje ${v.id}`}
          style={{
            color: 'var(--ui-color-primary)',
            textDecoration: 'underline',
          }}
        >
          Detalles
        </Link>
      ),
    },
  ];
}
