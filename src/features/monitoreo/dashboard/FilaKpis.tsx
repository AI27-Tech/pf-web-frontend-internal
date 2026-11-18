import { Grid } from '@ai27-tech/ui';
import { CheckCircle2, ClipboardList, ShieldCheck, Truck } from 'lucide-react';

import type { ReporteViajes } from '@/lib/contracts/reportes';
import { EstadoViaje } from '@/lib/contracts/viajeDetalle';

import { conteosEnCurso } from './conteos';
import { conteoDeEstado, kpisRango } from './kpis';
import { TarjetaKpi } from './TarjetaKpi';
import type { VistaSeleccionable } from './useDashboardMonitoreo';

export interface FilaKpisProps {
  readonly vista: VistaSeleccionable;
  /** `null` mientras carga. */
  readonly viajes: ReporteViajes | null;
}

/**
 * Solo las cifras que aportan algo al monitorista. «En curso»: cuántos viajes van en tránsito y
 * cuántos están aprobados. «Últimos 7 días»: cuántos viajes hubo y cuántos cerraron.
 */
export function FilaKpis({ vista, viajes }: FilaKpisProps) {
  const cargando = viajes === null;

  if (vista === 'en_curso') {
    const conteos = viajes ? conteosEnCurso(viajes.filas) : null;
    const enTransito = conteos ? conteoDeEstado(conteos, EstadoViaje.EnTransito) : 0;
    const aprobados = conteos ? conteoDeEstado(conteos, EstadoViaje.Aprobado) : 0;
    return (
      <Grid minItemWidth="14rem" gap={3} role="group" aria-label="Indicadores de viajes en curso">
        <TarjetaKpi
          icono={<Truck size={16} />}
          etiqueta="Viajes en tránsito"
          valor={enTransito}
          unidad="viajes"
          cargando={cargando}
          pie="Viajes con estado en tránsito"
        />
        <TarjetaKpi
          icono={<ShieldCheck size={16} />}
          etiqueta="Viajes aprobados"
          valor={aprobados}
          unidad="viajes"
          cargando={cargando}
          pie="Viajes con estado aprobado"
        />
      </Grid>
    );
  }

  const kpis = viajes ? kpisRango(viajes.filas, []) : null;
  return (
    <Grid minItemWidth="14rem" gap={3} role="group" aria-label="Indicadores del periodo">
      <TarjetaKpi
        icono={<ClipboardList size={16} />}
        etiqueta="Viajes del periodo"
        valor={kpis?.viajes ?? 0}
        unidad="viajes"
        cargando={cargando}
        pie="Viajes con registro en el periodo"
      />
      <TarjetaKpi
        icono={<CheckCircle2 size={16} />}
        etiqueta="Cerrados en el periodo"
        valor={kpis?.cerrados ?? 0}
        unidad="viajes"
        cargando={cargando}
        pie="Viajes con cierre registrado"
      />
    </Grid>
  );
}
