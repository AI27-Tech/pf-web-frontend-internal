import type { ReporteEstados, ReporteViajes } from '../contracts/reportes';
import { request } from './client';
import { ApiError } from './errors';

/**
 * Vista del reporte de viajes. La combinación sin `en_curso` y sin rango no existe en el
 * tipo: el contrato la rechaza con `400`.
 */
export type VistaDashboard =
  | { readonly vista: 'en_curso' }
  | { readonly vista: 'rango'; readonly desde: string; readonly hasta: string };

/** Periodo de `reporteEstados`. Ambos extremos son obligatorios. */
export interface PeriodoReporte {
  readonly desde: string;
  readonly hasta: string;
}

/** Error cuando la autorización no alcanza al reporte (`403`). */
export class ErrorReportesProhibido extends ApiError {
  constructor() {
    super('prohibido', 'No tienes autorización para ver este reporte.', 403);
    this.name = 'ErrorReportesProhibido';
  }
}

function clasificarErrorReportes(error: unknown): never {
  if (!(error instanceof ApiError)) throw error;
  if (error.status === 403) throw new ErrorReportesProhibido();
  throw error;
}

/**
 * Query de `reporteViajes`. La vista «en curso» envía `en_curso=true` y nunca envía rango.
 * La vista por rango envía `desde` y `hasta` y nunca envía `en_curso`.
 */
export function consultaReporteViajes(vista: VistaDashboard): string {
  if (vista.vista === 'en_curso') return '?en_curso=true';
  return `?desde=${encodeURIComponent(vista.desde)}&hasta=${encodeURIComponent(vista.hasta)}`;
}

/** Consulta el reporte de viajes con la vista indicada. */
export async function reporteViajes(
  vista: VistaDashboard,
  accessToken: string,
): Promise<ReporteViajes> {
  try {
    return await request<ReporteViajes>(`/reportes/viajes${consultaReporteViajes(vista)}`, {
      accessToken,
    });
  } catch (error) {
    clasificarErrorReportes(error);
  }
}

/**
 * Consulta la distribución por estado. Siempre envía `desde` y `hasta`. Los conteos son
 * cambios de estado del periodo, no viajes que están hoy en cada estado.
 */
export async function reporteEstados(
  periodo: PeriodoReporte,
  accessToken: string,
): Promise<ReporteEstados> {
  const consulta = `?desde=${encodeURIComponent(periodo.desde)}&hasta=${encodeURIComponent(periodo.hasta)}`;
  try {
    return await request<ReporteEstados>(`/reportes/estados${consulta}`, { accessToken });
  } catch (error) {
    clasificarErrorReportes(error);
  }
}
