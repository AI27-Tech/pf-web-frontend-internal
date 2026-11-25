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
  fecha_hora_servicio_pasada:
    'La fecha y hora del servicio ya pasó. Pídele a Cotización que la reprograme y vuelve a aprobar.',
  fecha_pago_fuera_de_vigencia:
    'La fecha del pago debe caer dentro de la vigencia de la última cotización, desde su entrega hasta su último día.',
  transicion_no_permitida:
    'La solicitud cambió de estado y esta acción ya no aplica. Recarga e intenta de nuevo.',
};

/**
 * `400` sin `codigo` propio. Cotizar y reprogramar lo usan para la fecha y hora del servicio en
 * el pasado (DEC-148 #66), y cotizar además para la moneda distinta de `MXN` y el monto negativo
 * (DEC-148 #62). Sin código no se puede decir cuál fue: se nombran las causas posibles.
 */
const VALIDACION_POR_ACCION: Readonly<Partial<Record<AccionSolicitud, string>>> = {
  cotizar:
    'El servicio rechazó la cotización. Revisa que la fecha y hora del servicio sea posterior a este momento y que el monto no sea negativo.',
  reprogramar:
    'El servicio rechazó la fecha. La fecha y hora del servicio debe ser posterior a este momento.',
};

const TRANSICION_POR_ACCION: Readonly<Partial<Record<AccionSolicitud, string>>> = {
  // Un segundo `VENCIDA → PAGADO` responde lo mismo que un estado de origen inválido (DEC-148 #64).
  confirmarPago:
    'No se pudo confirmar el pago: la solicitud cambió de estado o ya tuvo su pago tardío, que solo se acepta una vez. Recarga para ver su estado.',
};

export function mensajeErrorSolicitud(error: unknown, accion: AccionSolicitud): string {
  const queHacer = TEXTO_ACCION[accion];
  if (!(error instanceof ApiError)) return `No se pudo ${queHacer}.`;
  const propioDeTransicion = TRANSICION_POR_ACCION[accion];
  if (error.codigo === 'transicion_no_permitida' && propioDeTransicion) return propioDeTransicion;
  const porCodigo = error.codigo ? POR_CODIGO[error.codigo] : undefined;
  if (porCodigo) return porCodigo;
  if (error.status === 400) {
    return VALIDACION_POR_ACCION[accion] ?? 'El servicio rechazó los datos. Revisa la captura.';
  }
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
