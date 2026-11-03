import type { Conversacion, Mensaje } from '@/lib/contracts/conversaciones';

export function aplicarConversaciones(
  actuales: readonly Conversacion[],
  cambios: readonly Conversacion[],
): Conversacion[] {
  const mapa = new Map(actuales.map((item) => [item.id, item]));
  for (const cambio of cambios) mapa.set(cambio.id, cambio);
  return [...mapa.values()];
}
export function aplicarMensajes(
  actuales: readonly Mensaje[],
  nuevos: readonly Mensaje[],
): Mensaje[] {
  const mapa = new Map(actuales.map((item) => [item.secuencia, item]));
  for (const mensaje of nuevos) mapa.set(mensaje.secuencia, mensaje);
  return [...mapa.values()].sort((a, b) => a.secuencia - b.secuencia);
}
