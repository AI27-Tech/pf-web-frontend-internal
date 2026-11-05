import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import {
  ErrorReportesProhibido,
  reporteEstados,
  reporteViajes,
  type PeriodoReporte,
  type VistaDashboard,
} from '@/lib/api/reportes';
import type { ReporteEstados, ReporteViajes } from '@/lib/contracts/reportes';

import { rangoUltimosSiete } from './rangoUltimosSiete';

export type VistaSeleccionable = 'en_curso' | 'rango';

export interface DashboardMonitoreoHook {
  readonly vista: VistaSeleccionable;
  readonly cambiarVista: (vista: VistaSeleccionable) => void;
  readonly viajes: ReporteViajes | null;
  readonly estados: ReporteEstados | null;
  readonly cargando: boolean;
  readonly vacio: boolean;
  readonly error: Error | null;
  readonly esProhibido: boolean;
  readonly reintentar: () => void;
}

/**
 * Dashboard de monitoreo (E8-T17, Bloque B). La vista por defecto es «En curso», que usa solo
 * `reporteViajes?en_curso=true`; `reporteEstados` no se consulta en esa vista. La vista
 * «Últimos 7 días» pide `reporteViajes` y `reporteEstados` con el mismo rango, fijado al
 * cambiar a la vista. Sin sondeo automático.
 */
export function useDashboardMonitoreo(): DashboardMonitoreoHook {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';

  const [vista, setVista] = useState<VistaSeleccionable>('en_curso');
  const [periodo, setPeriodo] = useState<PeriodoReporte | null>(null);

  const cambiarVista = (nueva: VistaSeleccionable) => {
    if (nueva === 'rango') setPeriodo(rangoUltimosSiete(new Date()));
    setVista(nueva);
  };

  const vistaDashboard: VistaDashboard | null =
    vista === 'en_curso'
      ? { vista: 'en_curso' }
      : periodo
        ? { vista: 'rango', desde: periodo.desde, hasta: periodo.hasta }
        : null;

  const viajesQuery = useQuery({
    queryKey: ['monitoreo', 'dashboard', 'viajes', vistaDashboard],
    queryFn: () => reporteViajes(vistaDashboard as VistaDashboard, accessToken),
    enabled: vistaDashboard !== null,
    retry: false,
  });

  const estadosQuery = useQuery({
    queryKey: ['monitoreo', 'dashboard', 'estados', periodo],
    queryFn: () => reporteEstados(periodo as PeriodoReporte, accessToken),
    enabled: vista === 'rango' && periodo !== null,
    retry: false,
  });

  const errorViajes = viajesQuery.error ?? null;
  const errorEstados = estadosQuery.error ?? null;
  const error = errorViajes ?? errorEstados;

  return {
    vista,
    cambiarVista,
    viajes: viajesQuery.data ?? null,
    estados: vista === 'rango' ? (estadosQuery.data ?? null) : null,
    cargando: viajesQuery.isLoading || estadosQuery.isLoading,
    vacio: viajesQuery.isSuccess && viajesQuery.data.total === 0,
    error,
    esProhibido: error instanceof ErrorReportesProhibido,
    reintentar: () => {
      void viajesQuery.refetch();
      if (vista === 'rango') void estadosQuery.refetch();
    },
  };
}
