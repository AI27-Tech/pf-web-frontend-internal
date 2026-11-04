import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

/** Reporte de viajes que devuelve `reporteViajes`: filas, total y frescura de la proyección. */
export type ReporteViajes = Schemas['ReporteViajes'];

/** Fila del reporte de viajes. */
export type FilaViaje = Schemas['FilaViaje'];

/** Reporte de distribución por estado que devuelve `reporteEstados`. */
export type ReporteEstados = Schemas['ReporteEstados'];

/** Conteo por estado dentro de `ReporteEstados`. */
export type ConteoEstado = Schemas['ConteoEstado'];
