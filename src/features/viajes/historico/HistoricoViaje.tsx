/*
 * Vista del histórico append-only del viaje (E8-T13, tareas 5, 8, 10, 11).
 *
 * Propiedad probatoria: NO se renderiza ningún gesto de editar ni borrar. La
 * corrección de una incidencia es una nueva entrada (el cierre), nunca una
 * reescritura de la apertura. La duración de la estadía se deriva de
 * inicio/cierre y nunca se clasifica como "prolongada" (DEC-038).
 *
 * Las capturas (nota, estadía, incidencia) viven en modales. La bitácora y las
 * incidencias van en columnas; las estadías, en una tabla a ancho completo.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  EmptyState,
  Form,
  FormField,
  Grid,
  Inline,
  Modal,
  Section,
  Skeleton,
  SkeletonTable,
  SkeletonText,
  Stack,
  Table,
  Textarea,
  Toast,
  ToastContainer,
} from '@ai27-tech/ui';
import type { Column } from '@ai27-tech/ui';

import { BloqueError } from '@/components/feedback/BloqueError';
import { useSession } from '@/context/SessionContext';
import { esNoEncontrado } from '@/lib/api/errors';
import { puede } from '@/lib/permisos';
import {
  ErrorAutorizacionInsuficiente,
  ErrorCondicionYaAbierta,
  ErrorEstadiaYaCerrada,
} from '@/lib/api/historicoViaje';
import type {
  EjeAutorizacionEstadia,
  EntradaBitacora,
  Estadia,
  Incidencia,
  IncidenciaEntrada,
} from '@/lib/contracts/historicoViaje';

import { duracionEstadia } from './duracionEstadia';
import { EstadiaForm } from './EstadiaForm';
import { ETIQUETA_EJE, ETIQUETA_MOTIVO } from './etiquetas';
import { IncidenciaForm } from './IncidenciaForm';
import { NotaForm } from './NotaForm';
import { useHistoricoViaje } from './useHistoricoViaje';

export interface HistoricoViajeProps {
  readonly id: string;
}

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error';
}

/** Variante del badge de autorización: lo que requiere atención se ve de inmediato. */
const VARIANTE_EJE: Record<EjeAutorizacionEstadia, 'secure' | 'alert' | 'warning'> = {
  autorizada: 'secure',
  no_autorizada: 'alert',
  antes_200km: 'warning',
};

/** Formatea una marca de tiempo ISO a una cadena legible local. */
function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleString();
}

/** Formatea una duración en ms a "Xh Ym"; null si no es derivable. */
function formatearDuracion(ms: number | null): string {
  if (ms === null) return '—';
  const totalMin = Math.floor(ms / 60_000);
  const horas = Math.floor(totalMin / 60);
  const minutos = totalMin % 60;
  return horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;
}

/** Cantidad entre paréntesis en el título de la sección; vacía mientras la lista carga. */
function sufijoCantidad(cantidad: number | undefined): string {
  return cantidad === undefined ? '' : ` (${cantidad})`;
}

/** Tiempo actual que se actualiza cada `intervaloMs`; alimenta la duración de lo abierto. */
function useAhora(intervaloMs: number): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}

/** Delegación al AppShell cuando la sesión no autoriza (401/sesión finalizada). */
function DelegacionSesion() {
  return (
    <Card variant="outlined">
      <CardBody>
        <Alert variant="danger">
          Tu sesión no está autorizada. Vuelve a iniciar sesión para ver el histórico.
        </Alert>
      </CardBody>
    </Card>
  );
}

/** Sin permiso (403): la sesión es válida pero el rol no tiene acceso al histórico. */
function SinPermiso() {
  return (
    <Card variant="outlined">
      <CardBody>
        <Alert variant="danger">No tienes permiso para ver el histórico de este viaje.</Alert>
      </CardBody>
    </Card>
  );
}

/** No encontrado (404): el viaje no existe o queda fuera del alcance. No sugiere un permiso. */
function ViajeNoEncontrado() {
  return (
    <Card variant="outlined">
      <CardBody>
        <EmptyState
          role="status"
          size="sm"
          title="Viaje no encontrado"
          description="Revisa el identificador o vuelve a la lista de viajes."
        />
      </CardBody>
    </Card>
  );
}

export function HistoricoViaje({ id }: HistoricoViajeProps) {
  const { usuario } = useSession();
  const navigate = useNavigate();
  const h = useHistoricoViaje(id);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [incidenciaAResolver, setIncidenciaAResolver] = useState<Incidencia | null>(null);
  const [estadiaACerrar, setEstadiaACerrar] = useState<Estadia | null>(null);
  const [notaAbierta, setNotaAbierta] = useState(false);
  const [estadiaAbierta, setEstadiaAbierta] = useState(false);
  const [incidenciaAbierta, setIncidenciaAbierta] = useState(false);
  const toastIdRef = useRef(0);

  const addToast = (message: string, type: 'success' | 'error' = 'error') => {
    const toastId = `toast-${toastIdRef.current++}`;
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 4000);
  };
  const removeToast = (toastId: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== toastId));

  // Req: delegación de sesión no autorizada antes del error genérico.
  if (h.esNoAutorizado) {
    return <DelegacionSesion />;
  }

  if (h.esProhibido) {
    return <SinPermiso />;
  }

  if (h.esNoEncontrado) {
    return <ViajeNoEncontrado />;
  }

  // Cada gesto de escritura sale de su capacidad (M6); JO ve el histórico en solo lectura.
  const rol = usuario?.rol;
  const puedeCorregir = puede(rol, 'viaje.incidencia.resolver');
  const puedeRegistrarNota = puede(rol, 'viaje.bitacora.registrar');
  const puedeOperarEstadia = puede(rol, 'viaje.estadia.operar');
  const puedeAbrirIncidencia = puede(rol, 'viaje.incidencia.abrir');

  // Un 403 en una acción se dice como falta de permiso y un 404, como viaje que ya no está
  // disponible (vuelve a la lista); la vista y la sesión siguen (T2.3, T2.4).
  const avisarFallo = (error: unknown, mensaje: string) => {
    if (esNoEncontrado(error)) {
      addToast('Este viaje ya no está disponible.', 'error');
      void navigate({ to: '/viajes' });
      return;
    }
    addToast(
      error instanceof ErrorAutorizacionInsuficiente
        ? 'No tienes permiso para esta acción en este viaje.'
        : mensaje,
      'error',
    );
  };

  // Al confirmar, el modal se cierra. Ante un error se queda abierto para corregir.
  const registrarNota = async (texto: string) => {
    try {
      await h.registrarNota({ texto });
      setNotaAbierta(false);
      addToast('Nota registrada en la bitácora.', 'success');
    } catch (error) {
      avisarFallo(error, 'No se pudo registrar la nota.');
    }
  };

  const abrirEstadia = async (entrada: Parameters<typeof h.abrirEstadia>[0]) => {
    try {
      await h.abrirEstadia(entrada);
      setEstadiaAbierta(false);
      addToast('Estadía abierta.', 'success');
    } catch (error) {
      avisarFallo(error, 'No se pudo abrir la estadía.');
    }
  };

  // El cierre es definitivo: la confirmación ya pidió la decisión, así que el modal se cierra
  // siempre que la llamada termina. Un error se avisa con su toast.
  const confirmarCierreEstadia = async () => {
    if (!estadiaACerrar) return;
    try {
      await h.cerrarEstadia(estadiaACerrar.id);
      addToast('Estadía cerrada.', 'success');
    } catch (error) {
      if (error instanceof ErrorEstadiaYaCerrada) {
        addToast('La estadía ya estaba cerrada.', 'error');
      } else {
        avisarFallo(error, 'No se pudo cerrar la estadía.');
      }
    }
    setEstadiaACerrar(null);
  };

  const abrirIncidencia = async (entrada: IncidenciaEntrada) => {
    try {
      await h.abrirIncidencia(entrada);
      setIncidenciaAbierta(false);
      addToast('Incidencia marcada.', 'success');
    } catch (error) {
      if (error instanceof ErrorCondicionYaAbierta) {
        addToast('Ya existe una incidencia abierta para este viaje.', 'error');
      } else {
        avisarFallo(error, 'No se pudo marcar la incidencia.');
      }
    }
  };

  const confirmarResolucion = async (resolucion: string) => {
    if (!incidenciaAResolver) return;
    try {
      await h.resolverIncidencia(incidenciaAResolver.id, { resolucion });
      setIncidenciaAResolver(null);
      addToast('Incidencia resuelta.', 'success');
    } catch (error) {
      if (error instanceof ErrorAutorizacionInsuficiente) {
        addToast('No tienes autorización para resolver incidencias.', 'error');
      } else if (esNoEncontrado(error)) {
        avisarFallo(error, 'No se pudo resolver la incidencia.');
      } else {
        addToast('No se pudo resolver la incidencia.', 'error');
      }
      setIncidenciaAResolver(null);
    }
  };

  return (
    <>
      <Stack gap={4}>
        <Grid minItemWidth="22rem" gap={4}>
          <Card style={{ height: '100%' }}>
            <CardBody>
              <Section
                title={`Bitácora${sufijoCantidad(h.bitacora.datos?.items.length)}`}
                divider
                actions={
                  puedeRegistrarNota ? (
                    <Button variant="primary" type="button" onClick={() => setNotaAbierta(true)}>
                      Nueva nota
                    </Button>
                  ) : undefined
                }
              >
                <BitacoraLista estado={h.bitacora} />
              </Section>
            </CardBody>
          </Card>

          <Card style={{ height: '100%' }}>
            <CardBody>
              <Section
                title={`Incidencias${sufijoCantidad(h.incidencias.datos?.items.length)}`}
                divider
                actions={
                  puedeAbrirIncidencia ? (
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setIncidenciaAbierta(true)}
                    >
                      Marcar incidencia
                    </Button>
                  ) : undefined
                }
              >
                <IncidenciasLista
                  estado={h.incidencias}
                  puedeCorregir={puedeCorregir}
                  onResolver={setIncidenciaAResolver}
                />
              </Section>
            </CardBody>
          </Card>
        </Grid>

        <Card>
          <CardBody>
            <Section
              title={`Estadías${sufijoCantidad(h.estadias.datos?.items.length)}`}
              divider
              actions={
                puedeOperarEstadia ? (
                  <Button variant="secondary" type="button" onClick={() => setEstadiaAbierta(true)}>
                    Abrir estadía
                  </Button>
                ) : undefined
              }
            >
              <EstadiasTabla
                estado={h.estadias}
                onCerrar={puedeOperarEstadia ? setEstadiaACerrar : undefined}
              />
            </Section>
          </CardBody>
        </Card>
      </Stack>

      <Modal
        open={notaAbierta}
        onClose={() => setNotaAbierta(false)}
        title="Nueva nota de bitácora"
      >
        <NotaForm enviando={h.registrandoNota} onRegistrar={registrarNota} />
      </Modal>

      <Modal open={estadiaAbierta} onClose={() => setEstadiaAbierta(false)} title="Abrir estadía">
        <EstadiaForm enviando={h.abriendoEstadia} onAbrir={abrirEstadia} />
      </Modal>

      <Modal
        open={estadiaACerrar !== null}
        onClose={() => setEstadiaACerrar(null)}
        title="Cerrar estadía"
        size="sm"
      >
        {estadiaACerrar && (
          <Stack gap={4}>
            <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
              Se cerrará la estadía de {ETIQUETA_MOTIVO[estadiaACerrar.motivo]}. El cierre no se
              puede deshacer.
            </p>
            <Inline gap={2} justify="end" wrap={false}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEstadiaACerrar(null)}
                disabled={h.cerrandoEstadia}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="button"
                loading={h.cerrandoEstadia}
                disabled={h.cerrandoEstadia}
                onClick={() => void confirmarCierreEstadia()}
              >
                Cerrar estadía
              </Button>
            </Inline>
          </Stack>
        )}
      </Modal>

      <Modal
        open={incidenciaAbierta}
        onClose={() => setIncidenciaAbierta(false)}
        title="Marcar incidencia"
      >
        <IncidenciaForm enviando={h.abriendoIncidencia} onAbrir={abrirIncidencia} />
      </Modal>

      <Modal
        open={incidenciaAResolver !== null}
        onClose={() => setIncidenciaAResolver(null)}
        title="Resolver incidencia"
      >
        {incidenciaAResolver && (
          <ResolucionForm
            enviando={h.resolviendoIncidencia}
            onConfirmar={confirmarResolucion}
            onCancelar={() => setIncidenciaAResolver(null)}
          />
        )}
      </Modal>

      <ToastContainer position="top-right">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            variant={toast.type === 'success' ? 'success' : 'error'}
            title={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>
    </>
  );
}

/** Bitácora append-only: autor, texto y marca de tiempo; sin acciones por registro. */
function BitacoraLista({
  estado,
}: {
  readonly estado: ReturnType<typeof useHistoricoViaje>['bitacora'];
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const items = estado.datos?.items ?? [];
  const cantidad = items.length;

  // Las notas nuevas van al final: al crecer la lista, el contenedor baja al último registro.
  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (contenedor) contenedor.scrollTop = contenedor.scrollHeight;
  }, [cantidad]);

  if (estado.cargando) {
    return <CargaBloques recurso="bitácora" />;
  }
  if (estado.error) {
    return (
      <BloqueError mensaje="No se pudo cargar la bitácora." onReintentar={estado.reintentar} />
    );
  }
  if (items.length === 0) {
    return <EmptyState size="sm" title="Aún no hay notas en la bitácora." />;
  }
  return (
    <div
      ref={contenedorRef}
      role="region"
      aria-label="Notas de la bitácora"
      tabIndex={0}
      style={{
        maxHeight: '24rem',
        overflowY: 'auto',
      }}
    >
      <Stack gap={3}>
        {items.map((entrada: EntradaBitacora, indice) => (
          <Stack key={entrada.id} gap={3}>
            {indice > 0 && <Divider />}
            <Stack gap={1}>
              <Inline gap={2} align="center" wrap>
                <span className="ui-text-label-md" style={{ color: 'var(--ui-color-text)' }}>
                  {entrada.autor}
                </span>
                <time
                  dateTime={entrada.ts}
                  className="ui-text-body-xs"
                  style={{ color: 'var(--ui-color-text-muted)' }}
                >
                  {formatearFecha(entrada.ts)}
                </time>
              </Inline>
              <p
                className="ui-text-body-sm"
                style={{
                  margin: 0,
                  color: 'var(--ui-color-text)',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                }}
              >
                {entrada.texto}
              </p>
            </Stack>
          </Stack>
        ))}
      </Stack>
    </div>
  );
}

/** Esqueleto de la bitácora: bloques con autor, hora y texto, como la lista real. */
function CargaBloques({ recurso }: { readonly recurso: string }) {
  const bloques = [0, 1, 2];
  return (
    <div role="status" aria-label={`Cargando ${recurso}`}>
      <Stack gap={3}>
        {bloques.map((bloque) => (
          <Stack key={bloque} gap={2}>
            <Inline gap={2} align="center">
              <Skeleton width="6rem" height="1rem" />
              <Skeleton width="8rem" height="0.875rem" />
            </Inline>
            <SkeletonText lines={2} />
          </Stack>
        ))}
      </Stack>
    </div>
  );
}

/**
 * Estadías en tabla a ancho completo. Las abiertas muestran el tiempo transcurrido y la
 * acción de cerrar; la duración nunca se califica (DEC-038).
 */
function EstadiasTabla({
  estado,
  onCerrar,
}: {
  readonly estado: ReturnType<typeof useHistoricoViaje>['estadias'];
  /** Sin `onCerrar` (rol de solo lectura) la tabla no ofrece cerrar. */
  readonly onCerrar: ((estadia: Estadia) => void) | undefined;
}) {
  const ahora = useAhora(60_000);

  if (estado.cargando) {
    return (
      <div role="status" aria-label="Cargando estadías">
        <SkeletonTable rows={3} columns={6} density="compact" />
      </div>
    );
  }
  if (estado.error) {
    return (
      <BloqueError mensaje="No se pudieron cargar las estadías." onReintentar={estado.reintentar} />
    );
  }

  const items = estado.datos?.items ?? [];
  const columnas: Column<Estadia>[] = [
    { key: 'motivo', header: 'Motivo', cell: (e) => ETIQUETA_MOTIVO[e.motivo] },
    {
      key: 'autorizacion',
      header: 'Autorización',
      cell: (e) => (
        <Badge variant={VARIANTE_EJE[e.eje_autorizacion]}>{ETIQUETA_EJE[e.eje_autorizacion]}</Badge>
      ),
    },
    { key: 'inicio', header: 'Inicio', cell: (e) => formatearFecha(e.inicio) },
    { key: 'cierre', header: 'Cierre', cell: (e) => (e.cierre ? formatearFecha(e.cierre) : '—') },
    {
      key: 'duracion',
      header: 'Duración',
      cell: (e) =>
        e.cierre === null || e.cierre === undefined
          ? `En curso: ${formatearDuracion(Math.max(0, ahora - Date.parse(e.inicio)))}`
          : formatearDuracion(duracionEstadia(e)),
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: (e) => {
        const abierta = e.cierre === null || e.cierre === undefined;
        return (
          <Badge variant={abierta ? 'warning' : 'neutral'}>{abierta ? 'Abierta' : 'Cerrada'}</Badge>
        );
      },
    },
    {
      key: 'accion',
      header: '',
      cell: (e) =>
        onCerrar && (e.cierre === null || e.cierre === undefined) ? (
          <Button variant="secondary" size="sm" type="button" onClick={() => onCerrar(e)}>
            Cerrar
          </Button>
        ) : null,
    },
  ];

  return (
    <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>
      <Table<Estadia>
        columns={columnas}
        data={items}
        rowKey={(e) => e.id}
        stickyHeader
        density="compact"
        aria-label="Estadías del viaje"
        emptyState={<EmptyState size="sm" title="Aún no hay estadías registradas." />}
      />
    </div>
  );
}

/** Incidencias como bloques, igual que la bitácora. Resolver solo si el rol lo permite. */
function IncidenciasLista({
  estado,
  puedeCorregir,
  onResolver,
}: {
  readonly estado: ReturnType<typeof useHistoricoViaje>['incidencias'];
  readonly puedeCorregir: boolean;
  readonly onResolver: (incidencia: Incidencia) => void;
}) {
  if (estado.cargando) {
    return <CargaBloques recurso="incidencias" />;
  }
  if (estado.error) {
    return (
      <BloqueError
        mensaje="No se pudieron cargar las incidencias."
        onReintentar={estado.reintentar}
      />
    );
  }
  const items = estado.datos?.items ?? [];
  if (items.length === 0) {
    return <EmptyState size="sm" title="No hay incidencias registradas en este viaje." />;
  }
  return (
    <Stack gap={3}>
      {items.map((incidencia: Incidencia, indice) => {
        const resuelta = incidencia.estado === 'resuelta';
        return (
          <Stack key={incidencia.id} gap={3}>
            {indice > 0 && <Divider />}
            <Stack gap={1}>
              <Inline gap={2} align="center" wrap>
                <span className="ui-text-label-md" style={{ color: 'var(--ui-color-text)' }}>
                  {incidencia.tipo_interno}
                </span>
                <Badge variant={resuelta ? 'neutral' : 'warning'}>
                  {resuelta ? 'Resuelta' : 'En atención'}
                </Badge>
              </Inline>
              <p
                className="ui-text-body-xs"
                style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}
              >
                Abierta en {formatearFecha(incidencia.abierta_en)}
                {incidencia.resuelta_en
                  ? ` · Resuelta en ${formatearFecha(incidencia.resuelta_en)}`
                  : ''}
              </p>
            </Stack>
            {!resuelta && puedeCorregir && (
              <Inline gap={0} wrap={false}>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => onResolver(incidencia)}
                >
                  Resolver incidencia
                </Button>
              </Inline>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}

/** Formulario de resolución dentro del modal; resolución obligatoria (el contrato la exige). */
function ResolucionForm({
  enviando,
  onConfirmar,
  onCancelar,
}: {
  readonly enviando: boolean;
  readonly onConfirmar: (resolucion: string) => Promise<void>;
  readonly onCancelar: () => void;
}) {
  const [resolucion, setResolucion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const envioEnCurso = useRef(false);

  const confirmar = async () => {
    if (envioEnCurso.current) return;
    const limpio = resolucion.trim();
    if (limpio.length === 0) {
      setError('Describe cómo se resolvió la incidencia.');
      return;
    }
    setError(null);
    envioEnCurso.current = true;
    try {
      await onConfirmar(limpio);
    } finally {
      envioEnCurso.current = false;
    }
  };

  return (
    <Form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void confirmar();
      }}
    >
      <Stack gap={3}>
        <FormField label="Resolución" required error={error ?? undefined}>
          <Textarea
            value={resolucion}
            onChange={(event) => {
              setResolucion(event.target.value);
              if (error) setError(null);
            }}
            disabled={enviando}
            rows={3}
            placeholder="Describe la resolución de la incidencia"
          />
        </FormField>
        <Inline gap={2} justify="end" wrap={false}>
          <Button variant="secondary" type="button" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" loading={enviando} disabled={enviando}>
            Confirmar resolución
          </Button>
        </Inline>
      </Stack>
    </Form>
  );
}
