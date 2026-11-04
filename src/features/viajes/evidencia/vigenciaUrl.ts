/**
 * Una URL de vida corta es vigente solo si `expira_en` cae estrictamente después de `ahora`.
 * Con `expira_en` igual a `ahora` ya no es vigente.
 *
 * @param expiraEn Marca de tiempo RFC 3339 que entrega el `bff`.
 * @param ahora Instante de referencia en milisegundos desde la época.
 */
export function urlVigente(expiraEn: string, ahora: number): boolean {
  return Date.parse(expiraEn) > ahora;
}
