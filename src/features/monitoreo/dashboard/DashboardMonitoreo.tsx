/*
 * Dashboard de monitoreo (E8-T17, Bloque B). Solo viajes y estatus en V1 (DT-09; incidencias
 * y alertas quedan fuera). Los rótulos son de trabajo, pendientes de aprobación de Producto.
 */

import { useState } from 'react';

import { Link } from '@tanstack/react-router';
import {
  Alert,
  Card,
  CardBody,
  EmptyState,
  FilterBar,
  PageHeader,
  Stack,
  type FilterDefinition,
} from '@ai27-tech/ui';
import { Truck } from 'lucide-react';

import { BloqueError } from '@/components/feedback/BloqueError';
import { RequiereCapacidad } from '@/components/permisos/RequiereCapacidad';
import { EstadoViaje } from '@/lib/contracts/viajeDetalle';

import { FilaKpis } from './FilaKpis';
import {
  filtrarViajes,
  FILTROS_INICIALES,
  type FiltrosViajes,
  type Periodo,
} from './filtrosViajes';
import { TAMANOS_PAGINA, ajustarPagina } from './paginar';
import { TarjetaViajes } from './TarjetaViajes';
import { useDashboardMonitoreo } from './useDashboardMonitoreo';

const TITULO = 'Dashboard de Monitoreo';
const DESCRIPCION =
  'Viajes y estatus de la operación. Incidencias y alertas no se muestran en esta versión.';

const OPCIONES_PERIODO = [
  { value: '', label: 'Todos' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
];

/** Filtros de la barra. Estado y fecha; los periodos son predefinidos. La fecha coincide si la creación o el cierre caen en el periodo. */
const FILTROS: FilterDefinition[] = [
  {
    key: 'estado',
    label: 'Estado',
    options: [
      { value: '', label: 'Todos' },
      ...Object.values(EstadoViaje).map((estado) => ({ value: estado, label: estado })),
    ],
  },
  { key: 'fecha', label: 'Fecha', options: OPCIONES_PERIODO },
];

function aPeriodo(valor: string): Periodo {
  return valor === 'hoy' || valor === 'semana' || valor === 'mes' ? valor : 'todos';
}

/**
 * El título siempre se muestra, también a roles sin acceso. Solo el contenido se bloquea: así
 * la ruta se puede verificar sin mostrar datos. Sin acceso, no hay consultas al `bff`.
 */
export function DashboardMonitoreo() {
  return (
    <Stack gap={4}>
      <PageHeader title={TITULO} description={DESCRIPCION} />
      <RequiereCapacidad capacidad="monitoreo.dashboard">
        <DashboardAutorizado />
      </RequiereCapacidad>
    </Stack>
  );
}

function DashboardAutorizado() {
  const d = useDashboardMonitoreo();
  const [pagina, setPagina] = useState(1);
  const [tamano, setTamano] = useState<number>(TAMANOS_PAGINA[0]);
  const [filtros, setFiltros] = useState<FiltrosViajes>(FILTROS_INICIALES);

  const filas = d.viajes ? filtrarViajes(d.viajes.filas, filtros, new Date()) : null;
  const total = filas?.length ?? 0;
  const paginaVigente = ajustarPagina(pagina, total, tamano);

  const cambiarFiltro = (clave: string, valor: string) => {
    setPagina(1);
    if (clave === 'estado') setFiltros((f) => ({ ...f, estado: valor }));
    if (clave === 'fecha') setFiltros((f) => ({ ...f, periodo: aPeriodo(valor) }));
  };

  const cambiarTamano = (nuevo: number) => {
    setTamano(nuevo);
    setPagina(1);
  };

  const errorBloqueante = !d.esProhibido && d.error && !d.viajes ? d.error : null;
  const mostrarContenido = !d.esProhibido && !errorBloqueante;

  return (
    <Stack gap={4}>
      <FilterBar
        filters={FILTROS}
        filterValues={{
          estado: filtros.estado,
          fecha: filtros.periodo === 'todos' ? '' : filtros.periodo,
        }}
        onFilterChange={cambiarFiltro}
        onClear={() => {
          setPagina(1);
          setFiltros(FILTROS_INICIALES);
        }}
        showActiveFilterChips={false}
      />

      {d.esProhibido && (
        <Alert variant="danger">No tienes autorización para ver este reporte.</Alert>
      )}

      {errorBloqueante && (
        <Card variant="outlined">
          <CardBody>
            <BloqueError mensaje="No se pudo cargar el dashboard." onReintentar={d.reintentar} />
          </CardBody>
        </Card>
      )}

      {mostrarContenido && d.vacio && (
        <EmptyState
          size="sm"
          icon={<Truck size={20} aria-hidden="true" />}
          title="Sin viajes para mostrar."
          description="No hay viajes en el periodo seleccionado."
        />
      )}

      {mostrarContenido && !d.vacio && (
        <div
          role={d.cargando ? 'status' : undefined}
          aria-label={d.cargando ? 'Cargando el dashboard' : undefined}
        >
          <Stack gap={4}>
            <FilaKpis vista={d.vista} viajes={d.viajes} />

            <TarjetaViajes
              filas={filas}
              pagina={paginaVigente}
              tamano={tamano}
              onPaginaChange={setPagina}
              onTamanoChange={cambiarTamano}
              enlaceVerTodos={<Link to="/viajes">Ver todos los viajes</Link>}
            />
          </Stack>
        </div>
      )}
    </Stack>
  );
}
