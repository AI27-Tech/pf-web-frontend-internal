import type { components } from '@ai27-tech/contracts/openapi/bff';

type Schemas = components['schemas'];

/** Expediente del viaje tal como lo compone el `bff` (`GET /viajes/{id}/descarga`). */
export type DescargaViaje = Schemas['DescargaViaje'];

/** Ficha técnica incluida en el expediente descargable. */
export type FichaTecnicaDescarga = Schemas['FichaTecnicaDescarga'];

/** Entrada de bitácora incluida en el expediente descargable. */
export type EntradaBitacoraDescarga = Schemas['EntradaBitacoraDescarga'];

/** Registro de auditoría incluido en el expediente descargable. */
export type RegistroAuditoriaDescarga = Schemas['RegistroAuditoriaDescarga'];
