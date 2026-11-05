import type { Conversacion } from '@/lib/contracts/conversaciones';

// Perder el reclamo no es un estado derivable del dato (un reclamo ajeno o un pool
// vacío ya lo explican): se muestra como `reclamada_por_otro` o `en_pool`.
export type RazonCompositor = 'en_pool' | 'reclamada_por_otro' | 'solo_lectura' | null;
export interface Capacidades {
  puedeReclamar: boolean;
  puedeResponder: boolean;
  puedeDevolverAlPool: boolean;
  puedeMarcarAtendida: boolean;
  razonCompositor: RazonCompositor;
}

export function capacidades(conversacion: Conversacion, sujetoId: string): Capacidades {
  const reclamante = conversacion.reclamo_activo?.responsable_id;
  const esMio = reclamante === sujetoId;
  const escribible = conversacion.estado === 'abierta';
  const razonCompositor: RazonCompositor = !escribible
    ? 'solo_lectura'
    : !reclamante
      ? 'en_pool'
      : esMio
        ? null
        : 'reclamada_por_otro';
  return {
    puedeReclamar: escribible && !reclamante,
    puedeResponder: escribible && esMio,
    puedeDevolverAlPool: escribible && esMio,
    puedeMarcarAtendida: escribible && esMio,
    razonCompositor,
  };
}
export const puedeReclamar = (c: Conversacion, id: string) => capacidades(c, id).puedeReclamar;
export const puedeResponder = (c: Conversacion, id: string) => capacidades(c, id).puedeResponder;
export const puedeDevolverAlPool = (c: Conversacion, id: string) =>
  capacidades(c, id).puedeDevolverAlPool;
export const puedeMarcarAtendida = (c: Conversacion, id: string) =>
  capacidades(c, id).puedeMarcarAtendida;
export const razonCompositor = (c: Conversacion, id: string) => capacidades(c, id).razonCompositor;
