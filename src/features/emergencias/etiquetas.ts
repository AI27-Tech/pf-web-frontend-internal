import type { EmergenciaReaccion, EstadoEmergencia } from '@/lib/contracts/emergencias';

export const ETIQUETA_ESTADO_EMERGENCIA: Record<EstadoEmergencia, string> = {
  abierta: 'Abierta',
  en_atencion: 'En atención',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
};

/** Responsable de la fila: "Tú", "Otra persona" o sin reclamar. Sin nombres de personas. */
export function etiquetaResponsable(caso: EmergenciaReaccion, sujetoId: string): string {
  if (!caso.reclamo_activo) return 'Sin reclamar';
  return caso.reclamo_activo.responsable_id === sujetoId ? 'Tú' : 'Otra persona';
}

/**
 * Texto para anunciar un cambio de estado o de responsable entre dos lecturas del caso.
 * Devuelve `null` si no cambió nada que el usuario deba saber.
 */
export function describirCambio(
  anterior: EmergenciaReaccion,
  actual: EmergenciaReaccion,
  sujetoId: string,
): string | null {
  const partes: string[] = [];
  if (anterior.estado !== actual.estado) {
    partes.push(`Estado: ${ETIQUETA_ESTADO_EMERGENCIA[actual.estado]}.`);
  }
  const respAnterior = anterior.reclamo_activo?.responsable_id ?? null;
  const respActual = actual.reclamo_activo?.responsable_id ?? null;
  if (respAnterior !== respActual) {
    if (respActual === null) partes.push('El caso quedó sin reclamar.');
    else if (respActual === sujetoId) partes.push('Tú tienes el caso.');
    else partes.push('Otra persona tiene el caso.');
  }
  return partes.length > 0 ? partes.join(' ') : null;
}
