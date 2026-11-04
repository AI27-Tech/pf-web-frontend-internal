/**
 * SHA-256 del archivo en hexadecimal minúscula (64 caracteres).
 *
 * Limitación conocida: carga el archivo completo en memoria con `arrayBuffer()`.
 * El tamaño máximo de un archivo grande está sin decidir; no se inventa aquí un límite.
 */
export async function calcularSha256(archivo: Blob): Promise<string> {
  const bytes = await archivo.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
