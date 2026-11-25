import type { TimelineItemData } from '@ai27-tech/ui';
import { EstadoViaje } from '@/lib/contracts/viajeDetalle';

/**
 * Pasos obligatorios del progreso del viaje (viaje.estados.yaml). Los títulos son el
 * `nombre_negocio` de cada estado del contrato.
 */
const PASOS: ReadonlyArray<{ readonly estado: string; readonly titulo: string }> = [
  { estado: EstadoViaje.Aprobado, titulo: 'Aprobado' },
  { estado: EstadoViaje.Asignado, titulo: 'Asignado' },
  { estado: EstadoViaje.EnTransito, titulo: 'En recorrido' },
  { estado: EstadoViaje.EnDestino, titulo: 'Arribo a destino' },
  { estado: EstadoViaje.Cerrado, titulo: 'Cerrado' },
];

/**
 * Estados opcionales (APTO_PARA_SALIDA, EN_EMBARQUE, EN_DESCARGA) pertenecen al paso
 * obligatorio que los contiene.
 */
const PASO_DE_ESTADO_OPCIONAL: Readonly<Record<string, number>> = {
  [EstadoViaje.AptoParaSalida]: 1,
  [EstadoViaje.EnEmbarque]: 1,
  [EstadoViaje.EnDescarga]: 3,
};

/** Nombre de negocio de cada estado (`nombre_negocio` en viaje.estados.yaml). */
const NOMBRE_ESTADO: Readonly<Record<string, string>> = {
  [EstadoViaje.Aprobado]: 'Aprobado',
  [EstadoViaje.Asignado]: 'Asignado',
  [EstadoViaje.AptoParaSalida]: 'Apto para salida',
  [EstadoViaje.EnEmbarque]: 'En embarque',
  [EstadoViaje.EnTransito]: 'En recorrido',
  [EstadoViaje.EnDestino]: 'Arribo a destino',
  [EstadoViaje.EnDescarga]: 'En descarga',
  [EstadoViaje.Cerrado]: 'Cerrado',
  [EstadoViaje.CanceladoPorCliente]: 'Cancelado por el cliente',
};

/** Nombre de negocio de un estado. Un token que el mapa no conoce se muestra tal cual. */
export function nombreEstado(estado: string): string {
  return NOMBRE_ESTADO[estado] ?? estado;
}

/** Índice del paso activo para un estado, o -1 si el estado no pertenece al progreso. */
export function indicePaso(estado: string): number {
  const indice = PASOS.findIndex((paso) => paso.estado === estado);
  if (indice >= 0) return indice;
  const opcional = Object.prototype.hasOwnProperty.call(PASO_DE_ESTADO_OPCIONAL, estado)
    ? PASO_DE_ESTADO_OPCIONAL[estado]
    : undefined;
  return opcional ?? -1;
}

/** Siguiente paso obligatorio del progreso, o undefined si el viaje está en el último paso o fuera del progreso. */
export function siguientePaso(estado: string): string | undefined {
  const activo = indicePaso(estado);
  if (activo < 0) return undefined;
  return PASOS[activo + 1]?.estado;
}

/** Puntos del progreso: cada paso obligatorio, completado, activo o pendiente. */
export function pasosSeguimiento(estado: string): TimelineItemData[] {
  const activo = indicePaso(estado);
  return PASOS.map((paso, indice) => ({
    id: paso.estado,
    title: paso.titulo,
    status: indice < activo ? 'completed' : indice === activo ? 'current' : 'upcoming',
  }));
}
