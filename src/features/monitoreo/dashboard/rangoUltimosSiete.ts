const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Rango de los últimos 7 días terminado en `ahora`. Función pura: no lee el reloj, así que
 * quien la llama decide cuándo fijar el rango.
 */
export function rangoUltimosSiete(ahora: Date): { readonly desde: string; readonly hasta: string } {
  return {
    desde: new Date(ahora.getTime() - SIETE_DIAS_MS).toISOString(),
    hasta: ahora.toISOString(),
  };
}
