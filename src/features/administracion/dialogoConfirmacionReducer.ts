/*
 * Estado del diálogo de confirmación (cambio de rol, desactivar, revocar, y
 * desactivar organización). Función pura.
 *
 * Las acciones que dependen de una consulta previa (la consecuencia de desactivar
 * una organización, R10.10) pasan por `consultando_consecuencia`. Confirmar solo
 * está permitido en `confirmando` o `listo`. Mientras hay una consulta o un envío
 * en vuelo, el diálogo no se puede cerrar.
 */

export type EstadoDialogoConfirmacion =
  | 'cerrado'
  | 'consultando_consecuencia'
  | 'error_consecuencia'
  | 'listo'
  | 'confirmando'
  | 'enviando'
  | 'error';

export type EventoDialogoConfirmacion =
  | 'abrir'
  | 'abrir_con_consecuencia'
  | 'consecuencia_lista'
  | 'consecuencia_fallida'
  | 'confirmar'
  | 'exito'
  | 'fallo'
  | 'cerrar';

export function reducirDialogoConfirmacion(
  estado: EstadoDialogoConfirmacion,
  evento: EventoDialogoConfirmacion,
): EstadoDialogoConfirmacion {
  switch (estado) {
    case 'cerrado':
      if (evento === 'abrir') return 'confirmando';
      if (evento === 'abrir_con_consecuencia') return 'consultando_consecuencia';
      return 'cerrado';

    case 'consultando_consecuencia':
      if (evento === 'consecuencia_lista') return 'listo';
      if (evento === 'consecuencia_fallida') return 'error_consecuencia';
      return 'consultando_consecuencia';

    case 'error_consecuencia':
      if (evento === 'abrir_con_consecuencia') return 'consultando_consecuencia';
      if (evento === 'cerrar') return 'cerrado';
      return 'error_consecuencia';

    case 'listo':
    case 'confirmando':
    case 'error':
      if (evento === 'confirmar') return 'enviando';
      if (evento === 'cerrar') return 'cerrado';
      return estado;

    case 'enviando':
      if (evento === 'exito') return 'cerrado';
      if (evento === 'fallo') return 'error';
      return 'enviando';
  }
}

/** Verdadero mientras el diálogo espera una respuesta del servidor. */
export function estaPendienteConfirmacion(estado: EstadoDialogoConfirmacion): boolean {
  return estado === 'consultando_consecuencia' || estado === 'enviando';
}
