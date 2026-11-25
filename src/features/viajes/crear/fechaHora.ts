/*
 * fechaHora — arma el `fecha_hora_servicio` del contrato a partir de los dos campos del
 * formulario, "Fecha" (`DateInput`, `YYYY-MM-DD`) y "Hora" (`TimePicker`, `HH:mm`).
 * Es el mismo criterio que usa el portal del cliente, para que ambos formularios
 * capturen y validen igual.
 *
 * El contrato espera un solo instante en UTC, RFC 3339 (`2026-11-20T15:30:00.000Z`).
 * La fecha y la hora capturadas son la hora de pared del navegador del operador; se
 * combinan en esa zona y se convierten a UTC aquí, una sola vez. Mandar solo fecha o
 * solo hora no es válido para el contrato.
 *
 * Solo clasifica lo capturado; si es obligatorio lo decide el formulario. No se rechazan
 * fechas pasadas: ninguna HU define esa regla. Función pura, sin estado ni efectos.
 */
export type ResultadoFechaHora =
  /** Ni fecha ni hora. */
  | { readonly estado: 'vacio' }
  /** Fecha y hora completas y reales; `iso` es el instante en UTC listo para el contrato. */
  | { readonly estado: 'valido'; readonly iso: string }
  /** Falta uno de los dos campos; no se puede formar un instante. */
  | { readonly estado: 'incompleto'; readonly falta: 'fecha' | 'hora' }
  /** Ambos tienen texto, pero no forman una fecha real (por ejemplo, 31 de febrero). */
  | { readonly estado: 'invalido' };

const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const PATRON_HORA = /^(\d{2}):(\d{2})$/;

export function resolverFechaHora(fecha: string, hora: string): ResultadoFechaHora {
  const tieneFecha = fecha !== '';
  const tieneHora = hora !== '';
  if (!tieneFecha && !tieneHora) return { estado: 'vacio' };
  if (!tieneFecha) return { estado: 'incompleto', falta: 'fecha' };
  if (!tieneHora) return { estado: 'incompleto', falta: 'hora' };

  const coincideFecha = PATRON_FECHA.exec(fecha);
  const coincideHora = PATRON_HORA.exec(hora);
  if (coincideFecha === null || coincideHora === null) return { estado: 'invalido' };

  const anio = Number(coincideFecha[1]);
  const mes = Number(coincideFecha[2]);
  const dia = Number(coincideFecha[3]);
  const horas = Number(coincideHora[1]);
  const minutos = Number(coincideHora[2]);

  // `setFullYear` evita que `new Date(año < 100, …)` reinterprete el año como 19xx.
  const local = new Date(2000, 0, 1, 0, 0, 0, 0);
  local.setFullYear(anio, mes - 1, dia);
  local.setHours(horas, minutos, 0, 0);

  // Ida y vuelta: rechaza fechas inexistentes u horas fuera de rango, que `Date`
  // corregiría en silencio hacia otro día.
  const esReal =
    !Number.isNaN(local.getTime()) &&
    local.getFullYear() === anio &&
    local.getMonth() === mes - 1 &&
    local.getDate() === dia &&
    local.getHours() === horas &&
    local.getMinutes() === minutos;
  if (!esReal) return { estado: 'invalido' };

  return { estado: 'valido', iso: local.toISOString() };
}
