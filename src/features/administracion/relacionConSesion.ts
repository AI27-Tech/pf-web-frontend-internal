/*
 * Relación del objetivo con la sesión (R7.7).
 *
 * Compara identificadores, nunca nombres. El `sub` de la sesión es opaco y
 * distinto del identificador del sujeto (DEC-072); la comparación válida es
 * contra el identificador comparable del objetivo (`idpSubject`, B-14). Si falta
 * cualquiera de los dos, la relación es `indeterminado` y la interfaz falla cerrada.
 */

export type RelacionConSesion = 'propio' | 'ajeno' | 'indeterminado';

interface ObjetivoConIdentidad {
  readonly idpSubject?: string | null;
}

interface SesionConUsuario {
  readonly usuario: { readonly id: string };
}

export function relacionConSesion(
  objetivo: ObjetivoConIdentidad,
  sesion: SesionConUsuario | null,
): RelacionConSesion {
  const idSesion = sesion?.usuario.id;
  const idObjetivo = objetivo.idpSubject;

  if (!idSesion || !idObjetivo) return 'indeterminado';
  return idSesion === idObjetivo ? 'propio' : 'ajeno';
}
