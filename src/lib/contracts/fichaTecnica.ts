/*
 * Contratos de la ficha técnica y del catálogo GPS.
 *
 * Los tipos provienen de @ai27-tech/contracts; esta capa solo ofrece alias
 * estables para que las features no dependan directamente del paquete generado.
 */

import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

/** Ficha técnica confirmada por el BFF. */
export type FichaTecnica = Schemas['FichaTecnica'];

/** Entrada parcial para el guardado PATCH de la ficha. */
export type FichaTecnicaEntrada = Schemas['FichaTecnicaEntrada'];

/** Dispositivo GPS registrado en el catálogo. */
export type DispositivoGps = Schemas['DispositivoGps'];

/** Página del catálogo GPS. */
export type PaginaGps = Schemas['PaginaGps'];
