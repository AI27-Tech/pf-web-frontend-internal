/*
 * Clasificación de errores de administración (E8-T19).
 *
 * Traduce un fallo del cliente HTTP a una clase de error con texto de interfaz.
 * La clasificación se hace por operación, estado HTTP y código de negocio. Los
 * códigos `ultimo_administrador`, `usuario_desactivado` y `rol_igual` son las
 * categorías que fija el diseño; los códigos `organizacion_invalida` y
 * `nombre_organizacion_duplicado` son provisionales hasta cerrar B-1 y se
 * confirman en la tarea 19.2. Si un código no distingue el motivo, el resultado
 * es un conflicto genérico y no se afirma ninguna causa (R5.6).
 */

import { ApiError, esSesionInvalida } from '@/lib/api/errors';
import { ErrorSuperficieNoPublicada } from '@/lib/api/administracion';

import { TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import type { RelacionConSesion } from './relacionConSesion';

export type OperacionAdministracion =
  | 'listarUsuarios'
  | 'obtenerUsuario'
  | 'altaUsuario'
  | 'fijarRol'
  | 'desactivarUsuario'
  | 'reactivarUsuario'
  | 'editarUsuario'
  | 'listarOrganizaciones'
  | 'crearOrganizacion'
  | 'editarOrganizacion'
  | 'consultarConsecuencia'
  | 'desactivarOrganizacion'
  | 'leerAlcance'
  | 'fijarAlcance'
  | 'revocarSesiones';

export type MotivoConflictoRol =
  'usuario_desactivado' | 'rol_igual' | 'ultimo_administrador' | 'rol_cruza_audiencia';

export type MotivoConflictoAlcance =
  'rol_sin_alcance' | 'subordinado_rol_invalido' | 'subordinado_con_superior';

/** 403 en cualquier operación. */
export class ErrorAutorizacionInsuficiente extends ApiError {
  constructor(codigo?: string) {
    // `prohibido`, no `noAutorizado`: el 403 no cierra la sesión (PR #28).
    super('prohibido', TEXTOS.autorizacionInsuficiente, 403, codigo);
    this.name = 'ErrorAutorizacionInsuficiente';
  }
}

/** 403 al cambiar el rol o el alcance del propio sujeto (R7.3, R7.4). */
export class ErrorAutoescaladaBloqueada extends ApiError {
  constructor() {
    super('prohibido', TEXTOS.autoescaladaBloqueada, 403);
    this.name = 'ErrorAutoescaladaBloqueada';
  }
}

/** 404 al leer el detalle de un usuario (R2.6). */
export class ErrorUsuarioNoDisponible extends ApiError {
  constructor() {
    super('noEncontrado', TEXTOS.usuarioNoDisponible, 404);
    this.name = 'ErrorUsuarioNoDisponible';
  }
}

/** 409 al cambiar el rol. Lleva el motivo solo si el código lo distingue (R5.6). */
export class ErrorConflictoRol extends ApiError {
  readonly motivo: MotivoConflictoRol | undefined;

  constructor(motivo?: MotivoConflictoRol, codigo?: string) {
    super('conflicto', textoConflictoRol(motivo), 409, codigo);
    this.name = 'ErrorConflictoRol';
    this.motivo = motivo;
  }
}

/** 409 al fijar el alcance (DEC-145). Lleva el motivo solo si el código lo distingue. */
export class ErrorConflictoAlcance extends ApiError {
  readonly motivo: MotivoConflictoAlcance | undefined;

  constructor(motivo?: MotivoConflictoAlcance, codigo?: string) {
    super('conflicto', textoConflictoAlcance(motivo), 409, codigo);
    this.name = 'ErrorConflictoAlcance';
    this.motivo = motivo;
  }
}

/** 409 `organizacion_desactivada`: la desactivación es terminal (DEC-139 #4). */
export class ErrorOrganizacionDesactivada extends ApiError {
  constructor() {
    super('conflicto', TEXTOS.organizacionDesactivada, 409, 'organizacion_desactivada');
    this.name = 'ErrorOrganizacionDesactivada';
  }
}

/** 409 genérico: el código no distingue una causa. No afirma motivo. */
export class ErrorConflicto extends ApiError {
  constructor(codigo?: string) {
    super('conflicto', TEXTOS.conflictoGenerico, 409, codigo);
    this.name = 'ErrorConflicto';
  }
}

/** 409 al desactivar al último administrador activo (R8.10). */
export class ErrorUltimoAdministrador extends ApiError {
  constructor() {
    super('conflicto', TEXTOS.ultimoAdministrador, 409, 'ultimo_administrador');
    this.name = 'ErrorUltimoAdministrador';
  }
}

/** 409 en el alta por identificador de usuario ya existente. */
export class ErrorIdentificadorDuplicado extends ApiError {
  constructor() {
    super('conflicto', TEXTOS.identificadorDuplicado, 409);
    this.name = 'ErrorIdentificadorDuplicado';
  }
}

/** 400 de validación. */
export class ErrorValidacion extends ApiError {
  constructor(codigo?: string) {
    super('red', TEXTOS.validacion, 400, codigo);
    this.name = 'ErrorValidacion';
  }
}

/** La organización elegida ya no es válida (R4.6). */
export class ErrorOrganizacionInvalida extends ApiError {
  constructor(status: number) {
    super('conflicto', TEXTOS.organizacionInvalida, status, 'organizacion_invalida');
    this.name = 'ErrorOrganizacionInvalida';
  }
}

/** Nombre de organización ya registrado (R9.12). */
export class ErrorNombreOrganizacionDuplicado extends ApiError {
  constructor() {
    super('conflicto', TEXTOS.nombreOrganizacionDuplicado, 409, 'nombre_organizacion_duplicado');
    this.name = 'ErrorNombreOrganizacionDuplicado';
  }
}

/**
 * 5xx o fallo de red. El texto depende de la operación: si hubo respuesta 5xx,
 * la acción no se aplicó; sin respuesta, el resultado no está confirmado.
 */
export class ErrorServicioNoDisponible extends ApiError {
  constructor(status?: number, codigo?: string) {
    const degradado = status !== undefined && status >= 500;
    super(
      degradado ? 'degradado' : 'red',
      degradado ? TEXTOS.servicioNoDisponibleAccion : TEXTOS.resultadoNoConfirmado,
      status,
      codigo,
    );
    this.name = 'ErrorServicioNoDisponible';
  }
}

function textoConflictoRol(motivo: MotivoConflictoRol | undefined): string {
  switch (motivo) {
    case 'usuario_desactivado':
      return TEXTOS.conflictoRolUsuarioDesactivado;
    case 'rol_igual':
      return TEXTOS.conflictoRolIgual;
    case 'ultimo_administrador':
      return TEXTOS.conflictoRolUltimoAdministrador;
    case 'rol_cruza_audiencia':
      return TEXTOS.conflictoRolCruzaAudiencia;
    default:
      return TEXTOS.conflictoRolGenerico;
  }
}

function textoConflictoAlcance(motivo: MotivoConflictoAlcance | undefined): string {
  switch (motivo) {
    case 'rol_sin_alcance':
      return TEXTOS.conflictoAlcanceRolSinAlcance;
    case 'subordinado_rol_invalido':
      return TEXTOS.conflictoAlcanceSubordinadoRolInvalido;
    case 'subordinado_con_superior':
      return TEXTOS.conflictoAlcanceSubordinadoConSuperior;
    default:
      return TEXTOS.conflictoGenerico;
  }
}

/**
 * Clasifica un fallo por estado HTTP y código. Es total: cualquier entrada
 * produce una clase de error. Quien llama decide antes si el fallo debe pasar sin
 * transformar (ver `clasificarFallo`).
 */
export function clasificarError(
  operacion: OperacionAdministracion,
  status: number | undefined,
  codigo: string | undefined,
  relacion?: RelacionConSesion,
): ApiError {
  if (status === undefined || status >= 500) return new ErrorServicioNoDisponible(status, codigo);

  if (status === 403) {
    // El `bff` declara `autoescalamiento` al cambiar el propio rol o alcance.
    const cambioSobrePropio =
      (operacion === 'fijarRol' || operacion === 'fijarAlcance') &&
      (codigo === 'autoescalamiento' || relacion === 'propio');
    return cambioSobrePropio
      ? new ErrorAutoescaladaBloqueada()
      : new ErrorAutorizacionInsuficiente(codigo);
  }

  if (status === 404) return new ErrorUsuarioNoDisponible();

  if (codigo === 'organizacion_desactivada') return new ErrorOrganizacionDesactivada();
  if (codigo === 'organizacion_invalida') return new ErrorOrganizacionInvalida(status);
  if (codigo === 'nombre_organizacion_duplicado') return new ErrorNombreOrganizacionDuplicado();

  if (status === 409) {
    if (operacion === 'fijarRol') return new ErrorConflictoRol(motivoConflictoRol(codigo), codigo);
    if (operacion === 'fijarAlcance')
      return new ErrorConflictoAlcance(motivoConflictoAlcance(codigo), codigo);
    if (operacion === 'desactivarUsuario' && codigo === 'ultimo_administrador') {
      return new ErrorUltimoAdministrador();
    }
    if (operacion === 'altaUsuario') return new ErrorIdentificadorDuplicado();
    return new ErrorConflicto(codigo);
  }

  if (status === 400 || status === 422) return new ErrorValidacion(codigo);

  return new ErrorServicioNoDisponible(status, codigo);
}

function motivoConflictoRol(codigo: string | undefined): MotivoConflictoRol | undefined {
  // El `bff` emite `sujeto_desactivado`; `usuario_desactivado` es la categoría de presentación.
  if (codigo === 'sujeto_desactivado' || codigo === 'usuario_desactivado') {
    return 'usuario_desactivado';
  }
  if (
    codigo === 'rol_igual' ||
    codigo === 'ultimo_administrador' ||
    codigo === 'rol_cruza_audiencia'
  ) {
    return codigo;
  }
  return undefined;
}

function motivoConflictoAlcance(codigo: string | undefined): MotivoConflictoAlcance | undefined {
  if (
    codigo === 'rol_sin_alcance' ||
    codigo === 'subordinado_rol_invalido' ||
    codigo === 'subordinado_con_superior'
  ) {
    return codigo;
  }
  return undefined;
}

/**
 * Aplica la clasificación a un fallo capturado. El `401` y la sesión finalizada
 * pasan sin transformar: los resuelve el flujo de sesión. Los errores que no son
 * `ApiError` (por ejemplo, la capacidad no publicada) también pasan sin cambio.
 */
export function clasificarFallo(
  operacion: OperacionAdministracion,
  error: unknown,
  relacion?: RelacionConSesion,
): unknown {
  if (!(error instanceof ApiError)) return error;
  if (error.status === 401 || error.kind === 'sesionFinalizada') return error;
  return clasificarError(operacion, error.status, error.codigo, relacion);
}

/**
 * Texto que muestra un diálogo para un fallo ya clasificado. Devuelve `null` si
 * la sesión no es válida: en ese caso el AppShell delega al flujo de sesión y el
 * diálogo no presenta la acción como realizada ni como fallida.
 */
export function textoDeFallo(error: unknown): string | null {
  if (esSesionInvalida(error)) return null;
  if (error instanceof ErrorSuperficieNoPublicada) return TEXTOS.superficieNoPublicada;
  if (error instanceof ApiError) return error.message;
  return TEXTOS.resultadoNoConfirmado;
}
