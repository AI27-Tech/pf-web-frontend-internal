/*
 * Tema visual de la aplicación: claro u oscuro.
 *
 * El tema se aplica con el atributo `data-theme` en <html>, que consume la
 * librería `@ai27-tech/ui` (ver globals.css). La elección del usuario se guarda
 * en localStorage. Si no hay elección guardada, se usa el tema oscuro, que es el
 * que fija index.html.
 */

/** Tema elegible por el usuario. */
export type Tema = 'claro' | 'oscuro';

const CLAVE_TEMA = 'ai27.tema';
const TEMA_POR_OMISION: Tema = 'oscuro';

/** Valor del atributo `data-theme` que espera la librería para cada tema. */
const ATRIBUTO_TEMA: Record<Tema, string> = {
  claro: 'light',
  oscuro: 'dark',
};

/** Tema guardado por el usuario, o el tema por omisión si no hay ninguno válido. */
export function leerTema(): Tema {
  const guardado = globalThis.localStorage?.getItem(CLAVE_TEMA);
  return guardado === 'claro' || guardado === 'oscuro' ? guardado : TEMA_POR_OMISION;
}

/** Aplica el tema al elemento raíz del documento. */
export function aplicarTema(tema: Tema, raiz: HTMLElement = document.documentElement): void {
  raiz.setAttribute('data-theme', ATRIBUTO_TEMA[tema]);
}

/** Aplica el tema y lo guarda para las siguientes sesiones del navegador. */
export function cambiarTema(tema: Tema): void {
  globalThis.localStorage?.setItem(CLAVE_TEMA, tema);
  aplicarTema(tema);
}
