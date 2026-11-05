import type { EmergenciaReaccion } from '@/lib/contracts/emergencias';

/** Responsable de la fila: "Tú", "Otra persona" o sin reclamar. Sin nombres de personas. */
export function etiquetaResponsable(caso: EmergenciaReaccion, sujetoId: string): string {
  if (!caso.reclamo_activo) return 'Sin reclamar';
  return caso.reclamo_activo.responsable_id === sujetoId ? 'Tú' : 'Otra persona';
}
