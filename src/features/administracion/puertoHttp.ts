import { crearAdministracionHttp, type AdministracionPort } from '@/lib/api/administracion';

/**
 * Puerto real de la administración sobre el `bff`. La ruta `/administracion` lo
 * entrega con `AdministracionProvider` (tarea 16.1). En `dev:mock` lo atienden los
 * mocks de `src/mocks/administracion.ts`.
 */
export const puertoAdministracionHttp: AdministracionPort = crearAdministracionHttp();
