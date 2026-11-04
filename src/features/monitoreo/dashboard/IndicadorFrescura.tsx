import { Badge } from '@ai27-tech/ui';

import { estadoFrescura, type ProyeccionFrescura } from './estadoFrescura';

export interface IndicadorFrescuraProps {
  readonly proyeccion: ProyeccionFrescura;
}

/**
 * Frescura de una proyección. El estado se comunica con texto y, en el caso atrasado,
 * con una marca visible; nunca solo con color. Los textos son de trabajo, pendientes de
 * aprobación de Producto.
 */
export function IndicadorFrescura({ proyeccion }: IndicadorFrescuraProps) {
  const estado = estadoFrescura(proyeccion);
  const momento = proyeccion.proyeccion_al
    ? `Proyección al ${new Date(proyeccion.proyeccion_al).toLocaleString('es-MX')}`
    : null;

  if (estado === 'atrasada') {
    return (
      <div style={{ display: 'flex', gap: 'var(--ui-space-2)', alignItems: 'center' }}>
        <Badge variant="alert">Datos atrasados</Badge>
        {momento && <span className="ui-text-body-xs">{momento}</span>}
      </div>
    );
  }

  if (estado === 'sin_datos') {
    return (
      <p className="ui-text-body-xs" style={{ margin: 0 }}>
        Sin datos aplicados aún
      </p>
    );
  }

  if (estado === 'no_informada') {
    return (
      <div style={{ display: 'flex', gap: 'var(--ui-space-2)', alignItems: 'center' }}>
        <Badge variant="neutral">Frescura no informada</Badge>
        {momento && <span className="ui-text-body-xs">{momento}</span>}
      </div>
    );
  }

  return momento ? (
    <p className="ui-text-body-xs" style={{ margin: 0 }}>
      {momento}
    </p>
  ) : null;
}
