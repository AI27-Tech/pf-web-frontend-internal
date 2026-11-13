import { useState } from 'react';
import { Alert, Badge, Button, Card, Grid, Inline, Modal, Section, Stack } from '@ai27-tech/ui';
import { useSession } from '@/context/SessionContext';
import type {
  DetalleEmergenciaReaccion,
  EmergenciaReaccion,
  NotaEmergencia,
  UnidadEscoltaEmergencia,
} from '@/lib/contracts/emergencias';
import { puedeCerrar, puedeDevolver, puedeReclamar, puedeResolver } from './afordancias';
import { BannerActualizacion } from './BannerActualizacion';
import { DialogoResolucion } from './DialogoResolucion';
import type { AccionCaso } from './useAccionesCaso';
import { etiquetaResponsable } from './etiquetas';

const ETIQUETA_AUTOR: Record<NotaEmergencia['audiencia_autor'], string> = {
  Cliente: 'Cliente',
  Interno: 'Interno',
};

interface PanelCasoProps {
  detalle: DetalleEmergenciaReaccion;
  notas: NotaEmergencia[];
  hayMasNotas: boolean;
  cargandoMasNotas: boolean;
  onCargarMasNotas: () => void;
  desactualizada: boolean;
  actualizadoEn: Date | null;
  enCurso: AccionCaso | null;
  errorAccion: Error | null;
  onReclamar: () => void;
  onDevolver: () => void;
  onResolver: (nota: string) => Promise<boolean>;
  onCerrar: () => void;
}

/**
 * Detalle de un caso para Reacción y gestos disponibles. No muestra ubicación,
 * `viaje_id`, `cliente_id`, `actor_real` ni enlaces al viaje (Req 3.4, 4.4).
 */
export function PanelCaso({
  detalle,
  notas,
  hayMasNotas,
  cargandoMasNotas,
  onCargarMasNotas,
  desactualizada,
  actualizadoEn,
  enCurso,
  errorAccion,
  onReclamar,
  onDevolver,
  onResolver,
  onCerrar,
}: PanelCasoProps) {
  const { usuario } = useSession();
  const rol = usuario?.rol ?? null;
  const sujetoId = usuario?.id ?? '';
  const caso: EmergenciaReaccion = detalle.caso;
  const viaje = detalle.viaje;
  const [confirmarDevolucion, setConfirmarDevolucion] = useState(false);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);
  const [errorResolucion, setErrorResolucion] = useState<string | null>(null);

  const bloqueado = enCurso !== null;

  return (
    <Card variant="outlined">
      <Grid gap={3}>
        <BannerActualizacion desactualizada={desactualizada} actualizadoEn={actualizadoEn} />
        <Inline gap={2} wrap align="stretch">
          <Badge variant="neutral">{caso.estado}</Badge>
          <span>{etiquetaResponsable(caso, sujetoId)}</span>
        </Inline>

        {errorAccion && <Alert variant="danger">{errorAccion.message}</Alert>}

        <Inline gap={2} wrap align="stretch">
          {puedeReclamar(rol, caso) && (
            <Button onClick={onReclamar} disabled={bloqueado}>
              Reclamar
            </Button>
          )}
          {puedeDevolver(rol, caso, sujetoId) && (
            <Button
              variant="outline"
              onClick={() => setConfirmarDevolucion(true)}
              disabled={bloqueado}
            >
              Devolver al pool
            </Button>
          )}
          {puedeResolver(rol, caso, sujetoId) && (
            <Button
              onClick={() => {
                setErrorResolucion(null);
                setResolviendo(true);
              }}
              disabled={bloqueado}
            >
              Resolver
            </Button>
          )}
          {puedeCerrar(rol, caso) && (
            <Button
              variant="secondary"
              onClick={() => setConfirmarCierre(true)}
              disabled={bloqueado}
            >
              Cerrar emergencia
            </Button>
          )}
        </Inline>

        <Section
          title={
            <span role="heading" aria-level={2}>
              Viaje
            </span>
          }
        >
          <Stack gap={1}>
            <p>Cliente: {viaje.cliente_nombre}</p>
            <p>Estado del viaje: {viaje.estado}</p>
            <p>Origen: {viaje.origen}</p>
            <h3 className="ui-text-body-sm" style={{ margin: 0 }}>
              Destinos
            </h3>
            {viaje.destinos.length === 0 && <p>Sin destinos.</p>}
            <ul style={{ margin: 0 }}>
              {viaje.destinos.map((destino, indice) => (
                <li key={indice}>
                  {destino.nombre}
                  {destino.fecha_cita
                    ? ` · Cita ${new Date(destino.fecha_cita).toLocaleString()}`
                    : ' · Sin fecha de cita'}
                  {' · '}
                  {destino.arribo ? 'Arribó' : 'Sin arribo'}
                </li>
              ))}
            </ul>
            {viaje.tipo_servicio && <p>Tipo de servicio: {viaje.tipo_servicio}</p>}
            {viaje.fecha_hora_servicio && (
              <p>Fecha y hora: {new Date(viaje.fecha_hora_servicio).toLocaleString()}</p>
            )}
            {viaje.eta_estimado && (
              <p>ETA estimado: {new Date(viaje.eta_estimado).toLocaleString()}</p>
            )}
          </Stack>
        </Section>

        <Section
          title={
            <span role="heading" aria-level={2}>
              Escolta
            </span>
          }
        >
          <Stack gap={1}>
            {viaje.escolta.length === 0 ? (
              <p>El viaje aún no tiene escolta asignada.</p>
            ) : (
              viaje.escolta.map((unidad, indice) => <EscoltaUnidad key={indice} unidad={unidad} />)
            )}
          </Stack>
        </Section>

        <Section
          title={
            <span role="heading" aria-level={2}>
              Notas
            </span>
          }
        >
          <Stack gap={2}>
            {notas.length === 0 && <p>Aún no hay notas.</p>}
            {notas.map((nota) => (
              <article
                key={nota.id}
                style={{ border: '1px solid var(--ui-color-border)', padding: 'var(--ui-space-2)' }}
              >
                <Inline gap={2} wrap={false} align="stretch">
                  <small>{ETIQUETA_AUTOR[nota.audiencia_autor]}</small>
                  <small>{new Date(nota.creado_en).toLocaleString()}</small>
                  {nota.es_resolucion && <Badge variant="secure">Nota de resolución</Badge>}
                </Inline>
                <p style={{ whiteSpace: 'pre-wrap' }}>{nota.cuerpo}</p>
              </article>
            ))}
            {hayMasNotas && (
              <Button variant="outline" onClick={onCargarMasNotas} disabled={cargandoMasNotas}>
                {cargandoMasNotas ? 'Cargando...' : 'Cargar más notas'}
              </Button>
            )}
          </Stack>
        </Section>
      </Grid>

      {resolviendo && (
        <DialogoResolucion
          enviando={enCurso === 'resolver'}
          error={errorResolucion}
          onCancelar={() => setResolviendo(false)}
          onConfirmar={async (nota) => {
            const ok = await onResolver(nota);
            if (ok) {
              setResolviendo(false);
            } else {
              setErrorResolucion('No se pudo resolver. Revisa la nota y el estado del caso.');
            }
            return ok;
          }}
        />
      )}

      <Modal
        open={confirmarDevolucion}
        onClose={() => setConfirmarDevolucion(false)}
        title="Devolver emergencia al pool"
      >
        <p>
          La emergencia quedará sin responsable y cualquier persona de Reacción podrá reclamarla.
        </p>
        <Inline gap={2} wrap={false} align="stretch">
          <Button variant="outline" onClick={() => setConfirmarDevolucion(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setConfirmarDevolucion(false);
              onDevolver();
            }}
            disabled={bloqueado}
          >
            Devolver al pool
          </Button>
        </Inline>
      </Modal>

      <Modal
        open={confirmarCierre}
        onClose={() => setConfirmarCierre(false)}
        title="Cerrar emergencia"
      >
        <p>Al cerrar, la emergencia sale de la bandeja y ya no admite notas.</p>
        <Inline gap={2} wrap={false} align="stretch">
          <Button variant="outline" onClick={() => setConfirmarCierre(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setConfirmarCierre(false);
              onCerrar();
            }}
            disabled={bloqueado}
          >
            Cerrar emergencia
          </Button>
        </Inline>
      </Modal>
    </Card>
  );
}

function EscoltaUnidad({ unidad }: { unidad: UnidadEscoltaEmergencia }) {
  return (
    <div style={{ border: '1px solid var(--ui-color-border)', padding: 'var(--ui-space-2)' }}>
      <strong>{unidad.tipo}</strong>
      {unidad.economico && <span> · Económico {unidad.economico}</span>}
      {unidad.placas && <span> · Placas {unidad.placas}</span>}
      {unidad.custodios.length === 0 ? (
        <p>Sin custodios registrados.</p>
      ) : (
        <ul>
          {unidad.custodios.map((custodio, indice) => (
            <li key={indice}>
              {custodio.nombre}
              {custodio.telefono ? ` · ${custodio.telefono}` : ' · Sin teléfono registrado'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
