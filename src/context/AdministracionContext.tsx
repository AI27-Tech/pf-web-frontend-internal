/*
 * AdministracionContext — inyecta el puerto de administración en la pantalla.
 *
 * Por defecto entrega la implementación "no publicada", así que sin Provider
 * la pantalla muestra el estado de brecha y no hace llamadas de red. Los hooks
 * consumen el puerto por este contexto; no importan el adaptador directamente.
 *
 * Exporta su Provider y su hook juntos (ver la nota en eslint.config.js sobre
 * react-refresh en src/context/).
 */

import { createContext, useContext, type ReactNode } from 'react';

import { ADMINISTRACION_NO_PUBLICADA, type AdministracionPort } from '@/lib/api/administracion';

const AdministracionContext = createContext<AdministracionPort>(ADMINISTRACION_NO_PUBLICADA);

interface AdministracionProviderProps {
  /** Puerto a inyectar. Omitirlo deja la implementación "no publicada". */
  readonly port?: AdministracionPort;
  readonly children: ReactNode;
}

export function AdministracionProvider({ port, children }: AdministracionProviderProps) {
  return (
    <AdministracionContext.Provider value={port ?? ADMINISTRACION_NO_PUBLICADA}>
      {children}
    </AdministracionContext.Provider>
  );
}

/** Puerto de administración vigente en el árbol. */
export function useAdministracionPort(): AdministracionPort {
  return useContext(AdministracionContext);
}
