/**
 * Texto legible de una unidad del roster (DT-19, tracer.38). El `bff` agrega el
 * económico, las placas y el nombre de los custodios desde `catalogos`; si alguno
 * ya no está en el catálogo, se muestra su id.
 */
import type { Unidad } from '@/lib/contracts/unidades';

export function vehiculoLegible(unidad: Unidad): string {
  const partes = [unidad.vehiculo?.economico, unidad.vehiculo?.placas].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : unidad.vehiculo_id;
}

export function custodiosLegibles(unidad: Unidad): string {
  const nombres = new Map((unidad.custodios ?? []).map((c) => [c.id, c.nombre]));
  return unidad.custodios_ids.map((id) => nombres.get(id) ?? id).join(', ');
}
