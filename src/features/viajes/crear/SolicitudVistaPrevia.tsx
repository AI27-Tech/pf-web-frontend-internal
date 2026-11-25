/*
 * SolicitudVistaPrevia — resumen en vivo del viaje que se está creando.
 *
 * Presentacional y sin estado: pinta lo que el operador captura en `CrearViaje` para que
 * confirme todo antes de enviarlo. No valida ni decide nada. Misma estructura que la vista
 * previa del portal del cliente.
 */
import {
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  Stack,
  Timeline,
  type DescriptionListItem,
  type TimelineItemData,
} from '@ai27-tech/ui';

interface SolicitudVistaPreviaProps {
  /** Origen tal como se captura (texto libre). */
  readonly origen: string;
  /** Nombres de los destinos intermedios, en orden. Vacío si no hay ninguno. */
  readonly paradas: readonly string[];
  /** Destino final: siempre es el último punto de la ruta (puede estar vacío). */
  readonly destino: string;
  /** Etiqueta del tipo de servicio elegido; vacía si no se eligió ninguno. */
  readonly tipoServicio: string;
  /** Etiqueta del tipo de escolta elegido; vacía si no se eligió ninguno. */
  readonly tipoEscolta: string;
  /** "No" sin sobreescolta; con ella, la etiqueta de su tipo (vacía si aún no se elige). */
  readonly sobreescolta: string;
  /** Instante ya combinado (UTC, ISO 8601); vacío si no hay fecha y hora completas. */
  readonly fechaHora: string;
}

/** Marca de dato vacío: guion visible y "Sin definir" para lectores de pantalla. */
const SIN_DEFINIR = (
  <>
    <span aria-hidden="true">—</span>
    <span className="ui-sr-only">Sin definir</span>
  </>
);

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatearFechaHora(valor: string): string {
  if (valor === '') return '';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : FORMATO_FECHA_HORA.format(fecha);
}

function textoDestinos(cantidad: number): string {
  if (cantidad === 0) return 'Ninguno';
  return cantidad === 1 ? '1 destino' : `${cantidad} destinos`;
}

export function SolicitudVistaPrevia({
  origen,
  paradas,
  destino,
  tipoServicio,
  tipoEscolta,
  sobreescolta,
  fechaHora,
}: SolicitudVistaPreviaProps) {
  // Ruta en orden: origen, destinos (los únicos numerados) y el destino final.
  const puntos = [
    { etiqueta: 'Origen', nombre: origen },
    ...paradas.map((nombre, indice) => ({ etiqueta: `Destino ${indice + 1}`, nombre })),
    { etiqueta: 'Destino final', nombre: destino },
  ];

  const ruta: TimelineItemData[] = puntos.map((punto, indice) => {
    const capturado = punto.nombre.trim() !== '';
    return {
      id: indice,
      title: punto.etiqueta,
      description: capturado ? punto.nombre : SIN_DEFINIR,
      status: capturado ? 'completed' : 'upcoming',
    };
  });

  const datos: DescriptionListItem[] = [
    { label: 'Tipo de servicio', value: tipoServicio },
    { label: 'Destinos intermedios', value: textoDestinos(paradas.length) },
    { label: 'Tipo de escolta', value: tipoEscolta },
    { label: 'Sobreescolta', value: sobreescolta },
    { label: 'Fecha y hora', value: formatearFechaHora(fechaHora), span: 2 },
  ];

  return (
    <aside aria-label="Vista previa del viaje">
      <Card variant="outlined" padding="lg">
        <CardHeader
          title="Resumen del viaje"
          subtitle="Se actualiza conforme completas el formulario, para que confirmes todo antes de crearlo."
        />
        <CardBody>
          <Stack gap={4}>
            <Timeline
              aria-label="Ruta del viaje"
              items={ruta}
              labels={{ completed: 'Capturado', upcoming: 'Pendiente' }}
            />
            <DescriptionList
              items={datos}
              columns={2}
              orientation="vertical"
              emptyValue={SIN_DEFINIR}
            />
          </Stack>
        </CardBody>
      </Card>
    </aside>
  );
}
