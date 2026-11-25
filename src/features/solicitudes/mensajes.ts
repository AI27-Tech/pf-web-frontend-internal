/*
 * Texto de los rechazos del servidor sobre una solicitud (Requirement T2 y 15). Se decide por el
 * `status` y el `codigo` de máquina del `bff`, nunca por su `mensaje`. El rechazo no menciona
 * reembolso: se maneja fuera de Argos (DEC-148 #19).
 */
import { ApiError } from '@/lib/api/errors';
import type { AccionSolicitud } from './afordancias';

export const TEXTO_ACCION: Record<AccionSolicitud, string> = {
  cotizar: 'enviar la cotización',
  reprogramar: 'reprogramar la solicitud',
  confirmarPago: 'confirmar el pago',
  revertirPago: 'revertir el pago',
  aprobar: 'aprobar la solicitud',
  rechazar: 'rechazar la solicitud',
};

const POR_CODIGO: Readonly<Record<string, string>> = {
  fecha_hora_servicio_requerida:
    'Falta la fecha y hora del servicio. Pídele a Cotización que la reprograme.',
  fecha_pago_fuera_de_vigencia:
    'La fecha del pago debe caer dentro de la vigencia de la última cotización, desde su entrega hasta su último día.',
  transicion_no_permitida:
    'La solicitud cambió de estado y esta acción ya no aplica. Recarga e intenta de nuevo.',
};

export function mensajeErrorSolicitud(error: unknown, accion: AccionSolicitud): string {
  const queHacer = TEXTO_ACCION[accion];
  if (!(error instanceof ApiError)) return `No se pudo ${queHacer}.`;
  const porCodigo = error.codigo ? POR_CODIGO[error.codigo] : undefined;
  if (porCodigo) return porCodigo;
  if (error.status === 400) return `El servicio rechazó los datos. Revisa la captura.`;
  switch (error.kind) {
    case 'prohibido':
      return `No tienes permiso para ${queHacer}.`;
    case 'noEncontrado':
      return 'La solicitud ya no está disponible.';
    case 'conflicto':
      return 'La solicitud cambió en otra operación. Recarga e intenta de nuevo.';
    case 'degradado':
      return 'El servicio no está disponible. Reintenta más tarde.';
    case 'red':
      return 'No se pudo conectar con el servicio. Revisa la conexión.';
    default:
      return `No se pudo ${queHacer}.`;
  }
}
