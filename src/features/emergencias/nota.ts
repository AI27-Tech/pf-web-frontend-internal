/** Longitud máxima de una nota, igual para resolución y para notas del monitoreo (contrato). */
export const LONGITUD_MAXIMA_NOTA = 1000;

/** Recorta espacios y valida el rango 1 a 1.000 caracteres. */
export function normalizarNota(texto: string): string {
  return texto.trim();
}

export function esNotaValida(texto: string): boolean {
  const limpia = normalizarNota(texto);
  return limpia.length >= 1 && limpia.length <= LONGITUD_MAXIMA_NOTA;
}
