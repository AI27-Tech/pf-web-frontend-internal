/**
 * Entrega del expediente descargado (E8-T17).
 *
 * El formato final y el nombre definitivo del archivo siguen pendientes de
 * Producto (Pregunta abierta 3). Por eso el nombre es provisional.
 */

/** Serializa el expediente tal cual llega del `bff`: sin filtrar, renombrar ni agregar claves. */
export function serializarExpediente(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

/** Nombre provisional del archivo del expediente. No es un contrato. */
export function nombreProvisionalExpediente(viajeId: string): string {
  return `expediente-${viajeId}.json`;
}

/** Dispara la descarga del contenido en el navegador. Es el único efecto del módulo. */
export function entregarArchivo(contenido: string, nombre: string): void {
  const blob = new Blob([contenido], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const ancla = document.createElement('a');
  ancla.href = url;
  ancla.download = nombre;
  document.body.appendChild(ancla);
  try {
    ancla.click();
  } finally {
    ancla.remove();
    URL.revokeObjectURL(url);
  }
}
