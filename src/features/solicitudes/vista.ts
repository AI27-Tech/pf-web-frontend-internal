/*
 * Textos derivados de una solicitud que comparten la bandeja y el detalle (M14).
 */
import type { Solicitud } from '@/lib/contracts/solicitudes';

/** Nombre del cliente; el `id` si el catálogo ya no lo tiene, `—` si no hay ninguno. */
export function nombreCliente(solicitud: Solicitud): string {
  return solicitud.cliente?.nombre ?? solicitud.cliente?.id ?? solicitud.cliente_id ?? '—';
}

export function resumenRuta(solicitud: Solicitud): string {
  const destinos = solicitud.destinos.map((destino) => destino.nombre).join(', ');
  return destinos ? `${solicitud.origen} → ${destinos}` : solicitud.origen;
}
