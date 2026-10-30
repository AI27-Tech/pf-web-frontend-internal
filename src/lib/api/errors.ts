/*
 * Taxonomía de errores de API.
 *
 * Un aguas-abajo caído (`degradado`) no es un "no encontrado" (`noEncontrado`),
 * y un conflicto de versión (409) no se reintenta a ciegas (P20). La política de
 * reintento se deriva de esta taxonomía.
 */

export type ApiErrorKind =
  /** Credenciales inválidas al iniciar sesión (401 en /sesion). */
  | 'invalidCredentials'
  /** Token ausente o vencido a media conexión: reconecta tras refrescar. */
  | 'noAutorizado'
  /** La sesión no pudo recuperarse y el portal ejecutó el corte. */
  | 'sesionFinalizada'
  /** Recurso inexistente (404). */
  | 'noEncontrado'
  /** Un servicio aguas-abajo respondió degradado (5xx). No es ausencia de dato. */
  | 'degradado'
  /** Conflicto de versión (409). Se resuelve recargando, no reintentando. */
  | 'conflicto'
  /** Fallo de red o respuesta no interpretable. */
  | 'red';

/** Error de dominio de la API. Lleva la clase del fallo, no solo un mensaje. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  /**
   * Código de negocio que el `bff` serializa en el cuerpo del error (p. ej.
   * `transicion_no_permitida`, `viaje_en_estado_terminal`). La UI distingue la
   * causa a partir de él, no del `mensaje` (bff.yaml). `undefined` si el cuerpo
   * no traía código o no era interpretable.
   */
  readonly codigo: string | undefined;

  constructor(kind: ApiErrorKind, message: string, status?: number, codigo?: string) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.codigo = codigo;
  }
}

/** Deriva la clase del error a partir del código HTTP. */
export function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return 'noAutorizado';
  if (status === 404) return 'noEncontrado';
  if (status === 409) return 'conflicto';
  if (status >= 500) return 'degradado';
  return 'red';
}
