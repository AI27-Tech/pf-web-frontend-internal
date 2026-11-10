/*
 * Etiquetas de respaldo para datos opcionales (B-15).
 *
 * `nombre` e `identificador_usuario` pueden faltar en usuarios dados de alta antes
 * de tracer.40. No es un error: la interfaz muestra un texto de respaldo y nunca
 * inventa el dato.
 */

/** Datos que pueden faltar en el wire (B-15); ver UsuarioResumen. */
interface DatosEtiqueta {
  readonly nombre?: string | undefined;
  readonly identificadorUsuario?: string | undefined;
}

import { TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';

/** Nombre visible: el nombre si existe; si no, el identificador; si no, el respaldo. */
export function etiquetaUsuario(usuario: DatosEtiqueta): string {
  return usuario.nombre ?? usuario.identificadorUsuario ?? TEXTOS.usuarioSinNombre;
}

/** Identificador de acceso visible, o el respaldo cuando el usuario no lo tiene. */
export function etiquetaIdentificador(usuario: DatosEtiqueta): string {
  return usuario.identificadorUsuario ?? TEXTOS.usuarioSinIdentificador;
}
