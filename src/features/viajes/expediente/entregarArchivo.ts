/**
 * Entrega del expediente descargado (E8-T17).
 *
 * Formato de V1: JSON, con nombre `expediente-<viaje_id>.json` (Pregunta abierta 3
 * resuelta; CSV/XLSX quedan para V2).
 */

/** Serializa el expediente tal cual llega del `bff`: sin filtrar, renombrar ni agregar claves. */
export function serializarExpediente(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

/** Nombre del archivo del expediente: `expediente-<viaje_id>.json`. */
export function nombreExpediente(viajeId: string): string {
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
