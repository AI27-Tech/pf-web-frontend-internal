/** Tamaños de página de la tabla. El primero es el mínimo para mostrar la paginación. */
export const TAMANOS_PAGINA = [10, 25, 50] as const;

/** Número de páginas para `total` elementos. Siempre al menos 1, para que la UI tenga una página. */
function totalPaginas(total: number, tamano: number): number {
  return Math.max(1, Math.ceil(total / tamano));
}

/**
 * Ajusta una página a un rango válido: entre 1 y la última página. Se usa al recargar datos,
 * cuando la página actual puede quedar fuera del nuevo total.
 */
export function ajustarPagina(pagina: number, total: number, tamano: number): number {
  const tamanoSeguro = Math.max(1, Math.floor(tamano));
  const ultima = totalPaginas(total, tamanoSeguro);
  return Math.min(Math.max(1, Math.floor(pagina)), ultima);
}

/**
 * Elementos de una página (base 1). Devuelve a lo sumo `tamano` elementos. La página se ajusta
 * con `ajustarPagina`, así que una página fuera de rango devuelve la última válida.
 */
export function paginar<T>(items: readonly T[], pagina: number, tamano: number): T[] {
  const tamanoSeguro = Math.max(1, Math.floor(tamano));
  const actual = ajustarPagina(pagina, items.length, tamanoSeguro);
  const inicio = (actual - 1) * tamanoSeguro;
  return items.slice(inicio, inicio + tamanoSeguro);
}
