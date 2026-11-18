/*
 * Vista del histórico append-only del viaje (E8-T13, tareas 5, 8, 10, 11).
 *
 * Propiedad probatoria: NO se renderiza ningún gesto de editar ni borrar. La
 * corrección de una incidencia es una nueva entrada (el cierre), nunca una
 * reescritura de la apertura. La duración de la estadía se deriva de
 * inicio/cierre y nunca se clasifica como "prolongada" (DEC-038).
 */
import { useRef, useState } from 'react';

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Form,
  EmptyState,
  FormField,
  Inline,
  Modal,
  Stack,
  Textarea,
  Timeline,
  Toast,
  ToastContainer,
} from '@ai27-tech/ui';

import { BloqueError } from '@/components/feedback/BloqueError';
import { useSession } from '@/context/SessionContext';
import {
  ErrorAutorizacionInsuficiente,
  ErrorCondicionYaAbierta,
  ErrorEstadiaYaCerrada,
} from '@/lib/api/historicoViaje';
import type {
  EntradaBitacora,
  Estadia,
  Incidencia,
  IncidenciaEntrada,
} from '@/lib/contracts/historicoViaje';

import { duracionEstadia } from './duracionEstadia';
import { EstadiaForm } from './EstadiaForm';
import { IncidenciaForm } from './IncidenciaForm';
import { NotaForm } from './NotaForm';
import { puedeCorregirIncidencia } from './visibilidadCorreccion';
import { useHistoricoViaje } from './useHistoricoViaje';

export interface HistoricoViajeProps {
  readonly id: string;
}

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error';
}

const COLOR_MUTED = 'var(--ui-color-text-muted)';

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

/** Sin permiso (403): la sesión es válida pero el rol o el alcance no llega al histórico. */
function SinPermiso() {
  return (
    <Card variant="outlined">
      <CardBody>
        <Alert variant="danger">No tienes permiso para ver el histórico de este viaje.</Alert>
      </CardBody>
    </Card>
  );
}

export function HistoricoViaje({ id }: HistoricoViajeProps) {
  const { usuario } = useSession();
  const h = useHistoricoViaje(id);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [incidenciaAResolver, setIncidenciaAResolver] = useState<Incidencia | null>(null);
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

  const puedeCorregir = usuario ? puedeCorregirIncidencia(usuario.rol) : false;

  // Un 403 en una acción se dice como falta de permiso; la vista y la sesión siguen.
  const avisarFallo = (error: unknown, mensaje: string) =>
    addToast(
      error instanceof ErrorAutorizacionInsuficiente
        ? 'No tienes permiso para esta acción en este viaje.'
        : mensaje,
      'error',
    );

  const registrarNota = async (texto: string) => {
    try {
      await h.registrarNota({ texto });
      addToast('Nota registrada en la bitácora.', 'success');
    } catch (error) {
      avisarFallo(error, 'No se pudo registrar la nota.');
    }
  };

  const abrirEstadia = async (entrada: Parameters<typeof h.abrirEstadia>[0]) => {
    try {
      await h.abrirEstadia(entrada);
      addToast('Estadía abierta.', 'success');
    } catch (error) {
      avisarFallo(error, 'No se pudo abrir la estadía.');
    }
  };

  const cerrarEstadia = async (estadiaId: string) => {
    try {
      await h.cerrarEstadia(estadiaId);
      addToast('Estadía cerrada.', 'success');
    } catch (error) {
      if (error instanceof ErrorEstadiaYaCerrada) {
        addToast('La estadía ya estaba cerrada.', 'error');
      } else {
        avisarFallo(error, 'No se pudo cerrar la estadía.');
      }
    }
  };

  const abrirIncidencia = async (entrada: IncidenciaEntrada) => {
    try {
      await h.abrirIncidencia(entrada);
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
      } else {
        addToast('No se pudo resolver la incidencia.', 'error');
      }
      setIncidenciaAResolver(null);
    }
  };

  return (
    <Stack gap={4}>
      <Card variant="outlined">
        <CardHeader>Bitácora</CardHeader>
        <CardBody>
          <NotaForm enviando={h.registrandoNota} onRegistrar={registrarNota} />
          <div style={{ marginTop: 'var(--ui-space-4)' }}>
            <BitacoraLista estado={h.bitacora} />
          </div>
        </CardBody>
      </Card>

      <Card variant="outlined">
        <CardHeader>Estadías</CardHeader>
        <CardBody>
          <EstadiaForm enviando={h.abriendoEstadia} onAbrir={abrirEstadia} />
          <div style={{ marginTop: 'var(--ui-space-4)' }}>
            <EstadiasLista
              estado={h.estadias}
              cerrando={h.cerrandoEstadia}
              onCerrar={cerrarEstadia}
            />
          </div>
        </CardBody>
      </Card>

      <Card variant="outlined">
        <CardHeader>Incidencias</CardHeader>
        <CardBody>
          <IncidenciaForm enviando={h.abriendoIncidencia} onAbrir={abrirIncidencia} />
          <div style={{ marginTop: 'var(--ui-space-4)' }}>
            <IncidenciasLista
              estado={h.incidencias}
              puedeCorregir={puedeCorregir}
              onResolver={setIncidenciaAResolver}
            />
          </div>
        </CardBody>
      </Card>

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
    </Stack>
  );
}

/** Carga de un historial: región viva con texto accesible y esqueletos de Timeline. */
function CargaHistorial({ recurso }: { readonly recurso: string }) {
  return (
    <div role="status" aria-label={`Cargando ${recurso}`}>
      <Timeline items={[]} loading />
    </div>
  );
}

/** Bitácora append-only: autor, texto y marca de tiempo; sin acciones por registro. */
function BitacoraLista({
  estado,
}: {
  readonly estado: ReturnType<typeof useHistoricoViaje>['bitacora'];
}) {
  if (estado.cargando) {
    return <CargaHistorial recurso="bitácora" />;
  }
  if (estado.error) {
    return (
      <BloqueError mensaje="No se pudo cargar la bitácora." onReintentar={estado.reintentar} />
    );
  }
  const items = estado.datos?.items ?? [];
  return (
    <Timeline
      items={items.map((entrada: EntradaBitacora) => ({
        id: entrada.id,
        title: entrada.autor,
        description: entrada.texto,
        timestamp: formatearFecha(entrada.ts),
        dateTime: entrada.ts,
        status: 'completed',
      }))}
      emptyState={<EmptyState size="sm" title="Aún no hay notas en la bitácora." />}
    />
  );
}

/** Estadías con duración derivada y cierre; sin rótulo prolongada. */
function EstadiasLista({
  estado,
  cerrando,
  onCerrar,
}: {
  readonly estado: ReturnType<typeof useHistoricoViaje>['estadias'];
  readonly cerrando: boolean;
  readonly onCerrar: (estadiaId: string) => void;
}) {
  if (estado.cargando) {
    return <CargaHistorial recurso="estadías" />;
  }
  if (estado.error) {
    return (
      <BloqueError mensaje="No se pudieron cargar las estadías." onReintentar={estado.reintentar} />
    );
  }
  const items = estado.datos?.items ?? [];
  return (
    <Timeline
      items={items.map((estadia: Estadia) => {
        const abierta = (estadia.cierre ?? null) === null;
        return {
          id: estadia.id,
          title: `${estadia.motivo} · ${estadia.eje_autorizacion}`,
          timestamp: `Inicio: ${formatearFecha(estadia.inicio)}`,
          dateTime: estadia.inicio,
          description: estadia.cierre ? `Cierre: ${formatearFecha(estadia.cierre)}` : undefined,
          status: abierta ? 'current' : 'completed',
          content: (
            <Stack gap={1}>
              <Inline gap={2} align="center" wrap={false}>
                <Badge variant={abierta ? 'warning' : 'neutral'}>
                  {abierta ? 'Abierta' : 'Cerrada'}
                </Badge>
                <span className="ui-text-body-xs" style={{ color: COLOR_MUTED }}>
                  Duración: {formatearDuracion(duracionEstadia(estadia))}
                </span>
              </Inline>
              {abierta && (
                <div>
                  <Button
                    variant="secondary"
                    type="button"
                    loading={cerrando}
                    disabled={cerrando}
                    onClick={() => onCerrar(estadia.id)}
                  >
                    Cerrar estadía
                  </Button>
                </div>
              )}
            </Stack>
          ),
        };
      })}
      emptyState={<EmptyState size="sm" title="Aún no hay estadías registradas." />}
    />
  );
}

/** Incidencias del viaje (lectura `listarIncidencias`); resolver solo si el rol lo permite. */
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
    return <CargaHistorial recurso="incidencias" />;
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
  return (
    <Timeline
      items={items.map((incidencia: Incidencia) => {
        const resuelta = incidencia.estado === 'resuelta';
        return {
          id: incidencia.id,
          title: incidencia.tipo_interno,
          timestamp: `Abierta: ${formatearFecha(incidencia.abierta_en)}`,
          dateTime: incidencia.abierta_en,
          description: incidencia.resuelta_en
            ? `Resuelta: ${formatearFecha(incidencia.resuelta_en)}`
            : undefined,
          status: resuelta ? 'completed' : 'warning',
          content: (
            <Stack gap={1}>
              <Badge variant={resuelta ? 'neutral' : 'alert'}>
                {resuelta ? 'Resuelta' : 'En atención'}
              </Badge>
              {!resuelta && puedeCorregir && (
                <div>
                  <Button variant="secondary" type="button" onClick={() => onResolver(incidencia)}>
                    Resolver incidencia
                  </Button>
                </div>
              )}
            </Stack>
          ),
        };
      })}
      emptyState={<EmptyState size="sm" title="No hay incidencias registradas en este viaje." />}
    />
  );
}

/** Formulario de resolución dentro del modal; resolución obligatoria. */
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
