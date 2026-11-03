/*
 * Textos de error de la bandeja de conversaciones (E8-T15).
 *
 * PROVISIONALES: Producto aún no aprueba la redacción (nota de brechas de
 * `requirements.md`). Viven en un solo módulo para poder cambiarlos sin tocar la
 * lógica. Los clasifica `lib/api/conversaciones.ts` (una clase de error por
 * texto) y la interfaz solo muestra `error.message`: ninguna pantalla debe
 * mostrar cadenas técnicas como `POST /conversaciones/… → 403`.
 */
export const TEXTOS_ERROR_CONVERSACIONES = {
  /** 409 `conflicto_version_reclamo` (Req 3.4, 4.6, 6.4, 8.4). */
  conflictoVersionReclamo: 'La conversación cambió. Recarga para continuar.',
  /** 409 `conversacion_solo_lectura` (Req 10.2). */
  soloLectura: 'La ventana de escritura terminó.',
  /** 409 `stream_resync_required` (Req 11.4). No se muestra al usuario. */
  resyncRequerido: 'La bandeja necesita actualizarse.',
  /** 404 de la bandeja (Req 1.8). */
  sinBandeja: 'No tienes una bandeja asignada.',
  /** 403 de la bandeja (Req 1.9). */
  sinAcceso: 'No tienes autorización para esta bandeja.',
  /** 403 en liberar / marcar atendida (Req 6.5, 8.5). */
  soloResponsable: 'Solo el responsable activo puede ejecutar esta acción.',
  /** 403 en envío, reclamo u otra acción (Req 4.6, 9.6). */
  autorizacionInsuficiente: 'No tienes autorización para realizar esta acción.',
  /** 404 de una conversación: no distingue inexistente de sin acceso (Req 2.7). */
  conversacionNoDisponible: 'La conversación no está disponible.',
  /** 5xx, caída de red o respuesta no interpretable (Req 12.2). */
  servicioNoDisponible: 'No se pudo completar la operación. Intenta de nuevo.',
} as const;
