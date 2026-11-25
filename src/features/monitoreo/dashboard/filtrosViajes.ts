/** Periodos predefinidos para filtrar por fecha. «Todos» no filtra. */
export type Periodo = 'todos' | 'hoy' | 'semana' | 'mes';

/** Valores de los filtros de la barra. `estado` vacío significa todos los estados. */
export interface FiltrosViajes {
  readonly estado: string;
  readonly periodo: Periodo;
}

export const FILTROS_INICIALES: FiltrosViajes = { estado: '', periodo: 'todos' };

/** Fila mínima que necesita el filtro. Cumple con `FilaViaje` del reporte. */
export interface FilaFiltrable {
  readonly estado: string;
  readonly creado_en?: string | undefined;
  readonly cerrado_en?: string | null | undefined;
}

/**
 * Inicio del periodo en hora local: hoy a las 00:00, el lunes de la semana, o el día 1 del mes.
 * Devuelve null para «Todos».
 */
export function inicioPeriodo(periodo: Periodo, ahora: Date): Date | null {
  if (periodo === 'todos') return null;
  const inicio = new Date(ahora);
  inicio.setHours(0, 0, 0, 0);
  if (periodo === 'semana') {
    const desdeLunes = (inicio.getDay() + 6) % 7;
    inicio.setDate(inicio.getDate() - desdeLunes);
  } else if (periodo === 'mes') {
    inicio.setDate(1);
  }
  return inicio;
}

/** Una marca cae en el periodo si es igual o posterior al inicio. Sin marca, no cae. */
function enPeriodo(marca: string | null | undefined, periodo: Periodo, ahora: Date): boolean {
  const inicio = inicioPeriodo(periodo, ahora);
  if (inicio === null) return true;
  if (!marca) return false;
  const instante = new Date(marca).getTime();
  return !Number.isNaN(instante) && instante >= inicio.getTime();
}

/**
 * Filas que cumplen el filtro de estado y el de fecha. La fecha coincide si la creación o el
 * cierre caen en el periodo. Función pura: quien la llama fija `ahora`. El orden no cambia.
 */
export function filtrarViajes<T extends FilaFiltrable>(
  filas: readonly T[],
  filtros: FiltrosViajes,
  ahora: Date,
): T[] {
  return filas.filter(
    (fila) =>
      (filtros.estado === '' || fila.estado === filtros.estado) &&
      (enPeriodo(fila.creado_en, filtros.periodo, ahora) ||
        enPeriodo(fila.cerrado_en, filtros.periodo, ahora)),
  );
}
