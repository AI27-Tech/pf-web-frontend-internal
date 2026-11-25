/*
 * Bandeja de solicitudes (M14, Requirement 15).
 *
 * El Jefe Operativo trabaja solo `PAGADO`: la bandeja siempre pide ese estado y no muestra
 * filtro, columna de monto ni cotización (DEC-148 #22 y #67). Cotización y Administrador ven
 * todas y filtran por estado. Abrir una solicitud cambia `?id=` de la URL.
 */
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  Inline,
  Pagination,
  Stack,
  Table,
  type Column,
  type FilterDefinition,
} from '@ai27-tech/ui';
import { ClipboardList } from 'lucide-react';
import { BloqueError } from '@/components/feedback/BloqueError';
import { SinPermiso } from '@/components/permisos/SinPermiso';
import { useSession } from '@/context/SessionContext';
import { esProhibido, esSesionInvalida } from '@/lib/api/errors';
import {
  ESTADOS_SOLICITUD,
  type EstadoSolicitud,
  type Solicitud,
} from '@/lib/contracts/solicitudes';
import { estadoFijoDeBandeja, veDatosComerciales } from './afordancias';
import { ETIQUETA_ESTADO, VARIANTE_ESTADO, etiquetaAviso, formatearFechaHora } from './estados';
import { useBandejaSolicitudes } from './useSolicitudes';
import { nombreCliente, resumenRuta } from './vista';

/** El `bff` pagina por cursor y no publica su tamaño de página: solo posiciona el control. */
const TAMANO_PAGINA = 20;

const FILTRO_ESTADO: FilterDefinition = {
  key: 'estado',
  label: 'Estado',
  placeholder: 'Todos los estados',
  options: ESTADOS_SOLICITUD.map((estado) => ({ label: ETIQUETA_ESTADO[estado], value: estado })),
};

interface BandejaSolicitudesProps {
  readonly onAbrir: (id: string) => void;
}

export function BandejaSolicitudes({ onAbrir }: BandejaSolicitudesProps) {
  const { usuario } = useSession();
  const rol = usuario?.rol;
  const comercial = veDatosComerciales(rol);
  const b = useBandejaSolicitudes(estadoFijoDeBandeja(rol));

  const columnas: Column<Solicitud>[] = [
    { key: 'cliente', header: 'Cliente', cell: (s) => nombreCliente(s) },
    { key: 'ruta', header: 'Ruta', cell: (s) => resumenRuta(s) },
    {
      key: 'fecha',
      header: 'Fecha del servicio',
      cell: (s) => formatearFechaHora(s.fecha_hora_servicio),
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: (s) => <Badge variant={VARIANTE_ESTADO[s.estado]}>{ETIQUETA_ESTADO[s.estado]}</Badge>,
    },
    {
      key: 'avisos',
      header: 'Avisos',
      cell: (s) =>
        s.avisos.length === 0 ? (
          '—'
        ) : (
          <Inline gap={1} wrap>
            {s.avisos.map((aviso) => (
              <Badge key={aviso} variant="warning" size="sm">
                {etiquetaAviso(aviso)}
              </Badge>
            ))}
          </Inline>
        ),
    },
    // Monto solo para quien ve datos comerciales: el JO nunca recibe `cotizacion`.
    ...(comercial
      ? [
          {
            key: 'monto',
            header: 'Cotización',
            cell: (s: Solicitud) =>
              s.cotizacion ? `${s.cotizacion.monto} ${s.cotizacion.moneda}` : '—',
          },
        ]
      : []),
    {
      key: 'acciones',
      header: 'Acciones',
      cell: (s) => (
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Abrir solicitud de ${nombreCliente(s)}`}
          onClick={() => onAbrir(s.id)}
        >
          Abrir
        </Button>
      ),
    },
  ];

  if (esSesionInvalida(b.consulta.error)) return null;
  if (esProhibido(b.consulta.error)) {
    return <SinPermiso descripcion="No tienes permiso para ver las solicitudes." />;
  }
  if (b.consulta.error) {
    return (
      <BloqueError
        mensaje="No se pudo cargar la bandeja de solicitudes."
        onReintentar={() => void b.consulta.refetch()}
      />
    );
  }

  return (
    <Stack gap={4}>
      {!estadoFijoDeBandeja(rol) && (
        <FilterBar
          filters={[FILTRO_ESTADO]}
          filterValues={{ estado: b.estado ?? '' }}
          onFilterChange={(_clave: string, valor: string) =>
            b.cambiarFiltro((valor || undefined) as EstadoSolicitud | undefined)
          }
          onClear={() => b.cambiarFiltro(undefined)}
          showClear={Boolean(b.estado)}
          showActiveFilterChips
        />
      )}
      <Table<Solicitud>
        columns={columnas}
        data={[...b.filas]}
        rowKey={(s) => s.id}
        loading={b.consulta.isPending}
        aria-label="Bandeja de solicitudes"
        density="comfortable"
        emptyState={
          <EmptyState
            icon={<ClipboardList aria-hidden="true" />}
            title={comercial ? 'Sin solicitudes' : 'Sin solicitudes por aprobar'}
            description={
              comercial
                ? 'No hay solicitudes con este filtro.'
                : 'Las solicitudes pagadas aparecen aquí para que las apruebes o rechaces.'
            }
          />
        }
      />
      {(b.pagina > 1 || b.cursorSiguiente) && (
        <Pagination
          page={b.pagina}
          pageSize={TAMANO_PAGINA}
          total={
            b.cursorSiguiente
              ? b.pagina * TAMANO_PAGINA + 1
              : (b.pagina - 1) * TAMANO_PAGINA + b.filas.length
          }
          showInfo={false}
          onPageChange={(n) => b.irAPagina(n)}
        />
      )}
    </Stack>
  );
}
