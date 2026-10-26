/* Contratos del selector de clientes, generados desde el BFF tracer.20. */

import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

/** Cliente que el BFF devuelve dentro del alcance del jefe_operativo. */
export type Cliente = Schemas['Cliente'];

/** Página cursorada de clientes seleccionables. */
export type PaginaClientes = Schemas['PaginaClientes'];
