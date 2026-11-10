/*
 * Relación del objetivo con la sesión (R7.7).
 *
 * La resuelve el servidor: `UsuarioAdmin.es_propio` se calcula contra el `sub` del
 * token (B-14), porque el `sub` es opaco y distinto del identificador del sujeto
 * (DEC-072). La interfaz no compara identificadores ni nombres. `indeterminado`
 * queda solo para cuando no hay respuesta del `bff`, y la interfaz falla cerrada.
 */

export type RelacionConSesion = 'propio' | 'ajeno' | 'indeterminado';

interface ObjetivoConEsPropio {
  readonly esPropio?: boolean | null;
}

export function relacionConSesion(objetivo: ObjetivoConEsPropio | null): RelacionConSesion {
  const esPropio = objetivo?.esPropio;
  if (esPropio === undefined || esPropio === null) return 'indeterminado';
  return esPropio ? 'propio' : 'ajeno';
}
