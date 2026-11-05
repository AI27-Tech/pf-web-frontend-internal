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
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Form,
  FormField,
  Modal,
  Textarea,
  Toast,
  ToastContainer,
} from '@ai27-tech/ui';

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
const COLOR_TEXT = 'var(--ui-color-text)';

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
        <p role="alert" className="ui-text-body-sm" style={{ margin: 0, color: COLOR_TEXT }}>
          Tu sesión no está autorizada. Vuelve a iniciar sesión para ver el histórico.
        </p>
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

  const puedeCorregir = usuario ? puedeCorregirIncidencia(usuario.rol) : false;

  const registrarNota = async (texto: string) => {
    try {
      await h.registrarNota({ texto });
      addToast('Nota registrada en la bitácora.', 'success');
    } catch {
      addToast('No se pudo registrar la nota.', 'error');
    }
  };

  const abrirEstadia = async (entrada: Parameters<typeof h.abrirEstadia>[0]) => {
    try {
      await h.abrirEstadia(entrada);
      addToast('Estadía abierta.', 'success');
    } catch {
      addToast('No se pudo abrir la estadía.', 'error');
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
        addToast('No se pudo cerrar la estadía.', 'error');
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
        addToast('No se pudo marcar la incidencia.', 'error');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4)' }}>
      <h1 className="ui-text-headline-lg" style={{ margin: 0, color: COLOR_TEXT }}>
        Histórico del viaje: {id}
      </h1>

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
    </div>
  );
}

/** Lista cronológica append-only de la bitácora, con estados de UI. */
function BitacoraLista({
  estado,
}: {
  readonly estado: ReturnType<typeof useHistoricoViaje>['bitacora'];
}) {
  if (estado.cargando) {
    return (
      <p role="status" className="ui-text-body-sm" style={{ margin: 0, color: COLOR_MUTED }}>
        Cargando bitácora...
      </p>
    );
  }
  if (estado.error) {
    return (
      <div
        role="alert"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-2)' }}
      >
        <p className="ui-text-body-sm" style={{ margin: 0, color: COLOR_TEXT }}>
          No se pudo cargar la bitácora.
        </p>
        <Button variant="secondary" type="button" onClick={estado.reintentar}>
          Reintentar
        </Button>
      </div>
    );
  }
  const items = estado.datos?.items ?? [];
  if (items.length === 0) {
    return (
      <p role="status" className="ui-text-body-sm" style={{ margin: 0, color: COLOR_MUTED }}>
        Aún no hay notas en la bitácora.
      </p>
    );
  }
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ui-space-2)',
      }}
    >
      {items.map((entrada: EntradaBitacora) => (
        <li
          key={entrada.id}
          style={{
            borderInlineStart: '3px solid var(--ui-color-border)',
            paddingInlineStart: 'var(--ui-space-3)',
          }}
        >
          <p className="ui-text-body-sm" style={{ margin: 0, color: COLOR_TEXT }}>
            {entrada.texto}
          </p>
          <p className="ui-text-body-xs" style={{ margin: 0, color: COLOR_MUTED }}>
            {entrada.autor} · {formatearFecha(entrada.ts)}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Lista de estadías con duración derivada y cierre; sin rótulo prolongada. */
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
    return (
      <p role="status" className="ui-text-body-sm" style={{ margin: 0, color: COLOR_MUTED }}>
        Cargando estadías...
      </p>
    );
  }
  if (estado.error) {
    return (
      <div
        role="alert"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-2)' }}
      >
        <p className="ui-text-body-sm" style={{ margin: 0, color: COLOR_TEXT }}>
          No se pudieron cargar las estadías.
        </p>
        <Button variant="secondary" type="button" onClick={estado.reintentar}>
          Reintentar
        </Button>
      </div>
    );
  }
  const items = estado.datos?.items ?? [];
  if (items.length === 0) {
    return (
      <p role="status" className="ui-text-body-sm" style={{ margin: 0, color: COLOR_MUTED }}>
        Aún no hay estadías registradas.
      </p>
    );
  }
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ui-space-3)',
      }}
    >
      {items.map((estadia: Estadia) => {
        const abierta = (estadia.cierre ?? null) === null;
        return (
          <li
            key={estadia.id}
            style={{
              borderInlineStart: '3px solid var(--ui-color-border)',
              paddingInlineStart: 'var(--ui-space-3)',
            }}
          >
            <div style={{ display: 'flex', gap: 'var(--ui-space-2)', alignItems: 'center' }}>
              <span className="ui-text-body-sm" style={{ color: COLOR_TEXT }}>
                {estadia.motivo} · {estadia.eje_autorizacion}
              </span>
              <Badge variant={abierta ? 'warning' : 'neutral'}>
                {abierta ? 'Abierta' : 'Cerrada'}
              </Badge>
            </div>
            <p className="ui-text-body-xs" style={{ margin: 0, color: COLOR_MUTED }}>
              Inicio: {formatearFecha(estadia.inicio)}
              {estadia.cierre ? ` · Cierre: ${formatearFecha(estadia.cierre)}` : ''} · Duración:{' '}
              {formatearDuracion(duracionEstadia(estadia))}
            </p>
            {abierta && (
              <div style={{ marginTop: 'var(--ui-space-1)' }}>
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
          </li>
        );
      })}
    </ul>
  );
}

/** Lista de incidencias del viaje (lectura `listarIncidencias`); resolver solo si el rol lo permite. */
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
    return (
      <p role="status" className="ui-text-body-sm" style={{ margin: 0, color: COLOR_MUTED }}>
        Cargando incidencias...
      </p>
    );
  }
  if (estado.error) {
    return (
      <div
        role="alert"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-2)' }}
      >
        <p className="ui-text-body-sm" style={{ margin: 0, color: COLOR_TEXT }}>
          No se pudieron cargar las incidencias.
        </p>
        <Button variant="secondary" type="button" onClick={estado.reintentar}>
          Reintentar
        </Button>
      </div>
    );
  }
  const items = estado.datos?.items ?? [];
  if (items.length === 0) {
    return (
      <p role="status" className="ui-text-body-sm" style={{ margin: 0, color: COLOR_MUTED }}>
        No hay incidencias registradas en este viaje.
      </p>
    );
  }
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ui-space-3)',
      }}
    >
      {items.map((incidencia) => {
        const resuelta = incidencia.estado === 'resuelta';
        return (
          <li
            key={incidencia.id}
            style={{
              borderInlineStart: '3px solid var(--ui-color-border)',
              paddingInlineStart: 'var(--ui-space-3)',
            }}
          >
            <div style={{ display: 'flex', gap: 'var(--ui-space-2)', alignItems: 'center' }}>
              <span className="ui-text-body-sm" style={{ color: COLOR_TEXT }}>
                {incidencia.tipo_interno}
              </span>
              <Badge variant={resuelta ? 'neutral' : 'alert'}>
                {resuelta ? 'Resuelta' : 'En atención'}
              </Badge>
            </div>
            <p className="ui-text-body-xs" style={{ margin: 0, color: COLOR_MUTED }}>
              Abierta: {formatearFecha(incidencia.abierta_en)}
              {incidencia.resuelta_en
                ? ` · Resuelta: ${formatearFecha(incidencia.resuelta_en)}`
                : ''}
            </p>
            {!resuelta && puedeCorregir && (
              <div style={{ marginTop: 'var(--ui-space-1)' }}>
                <Button variant="secondary" type="button" onClick={() => onResolver(incidencia)}>
                  Resolver incidencia
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
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
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-3)' }}
    >
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
      <div style={{ display: 'flex', gap: 'var(--ui-space-2)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" type="button" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" loading={enviando} disabled={enviando}>
          Confirmar resolución
        </Button>
      </div>
    </Form>
  );
}
