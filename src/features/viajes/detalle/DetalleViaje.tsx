/*
 * Presentacion del detalle del viaje -- avance y ETA manual (E8-T8).
 *
 * Compone la pantalla del detalle: cabecera con estado y condiciones, lista de
 * acciones, formulario de ETA, y avisos de carrera/error con Toast.
 *
 * Ramifica el 401 (delega al AppShell sin pintar error) antes del error generico.
 * Estado de carga y error con opcion de reintento. Bucle multi-parada visible
 * desde los destinos del detalle (nombre + numero_envio).
 *
 * Solo componentes de @ai27-tech/ui: Badge, Button, Modal, Card, Toast, etc.
 * No crea componentes nuevos; afordancia faltante se reporta como brecha.
 */

import { useEffect, useRef, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Modal,
  Toast,
  ToastContainer,
} from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';

import { useSession } from '@/context/SessionContext';
import { ErrorTransicion } from '@/lib/api/viajeDetalle';
import type { CondicionAbierta, EstadoViaje, ViajeInterno } from '@/lib/contracts/viajeDetalle';
import { esTerminal } from '@/lib/contracts/viajeDetalle';

import { CausaForm } from './causaForm';
import { requiereCausa } from './causaTransicion';
import { EtaForm } from './etaForm';
import { useDetalleViaje } from './useDetalleViaje';

export interface DetalleViajeProps {
  readonly id: string;
}

/** Variante de Badge por condicion. */
const VARIANTE_CONDICION: Record<'INCIDENCIA' | 'SIN_SENAL', 'alert' | 'warning'> = {
  INCIDENCIA: 'alert',
  SIN_SENAL: 'warning',
};

/**
 * Fase del bucle multi-parada derivada del estado canónico del viaje (Req 5.1).
 *
 * BRECHA CONOCIDA: el contrato de `destinos` ({nombre, numero_envio}) NO trae
 * estado por parada, así que no es posible marcar cuál parada específica arribó
 * o descargó sin inventar dato (requirements.md, brecha #4). Lo que sí se deriva
 * honestamente del `estado` canónico es la FASE del bucle en curso. Si el `bff`
 * publica estado por parada, esta vista se enriquece sin reescribir la capa.
 */
function faseDelBucle(estado: string): string | null {
  switch (estado) {
    case 'EN_TRANSITO':
      return 'En tránsito hacia la siguiente parada';
    case 'EN_DESTINO':
      return 'Arribó a una parada (pendiente de descarga)';
    case 'EN_DESCARGA':
      return 'Descargando en la parada actual';
    default:
      return null;
  }
}

/** Tipo para el estado de toasts */
interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error';
}

/**
 * Componente principal de presentacion del detalle del viaje.
 *
 * Logica de ramificacion (Req 7.3, 7.1, 7.2, 5.1):
 * 1. Si 401: delega a sesion (logout + redirige a /login)
 * 2. Si otro error: muestra Card + boton reintento
 * 3. Si cargando y sin datos: indicador de carga
 * 4. Si datos: renderiza cabecera, acciones, modal, ETA, avisos
 */
export function DetalleViaje({ id }: DetalleViajeProps) {
  const d = useDetalleViaje(id);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [modalEtaAbierto, setModalEtaAbierto] = useState(false);
  /** Destino pendiente de confirmar con causa; null si no hay modal de causa abierto. */
  const [causaPendiente, setCausaPendiente] = useState<EstadoViaje | null>(null);
  const toastIdRef = useRef(0);

  // Helper para agregar un toast
  const addToast = (message: string, type: 'success' | 'error' = 'error') => {
    const id = `toast-${toastIdRef.current++}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto-remover despues de 4 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Helper para remover un toast manualmente
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Requirement 7.3: delegacion de 401 a la sesion del AppShell
  if (d.esNoAutorizado) {
    return <DelegacionSesion />;
  }

  // Requirement 7.1/7.2: error generico con reintento
  if (d.error) {
    return <EstadoError onReintentar={d.reintentar} />;
  }

  // Requirement 5.1: indicador de carga
  if (d.cargando) {
    return <EstadoCargando />;
  }

  // Si no hay datos tras carga, mostrar estado vacio
  if (!d.viaje) {
    return <EstadoVacio />;
  }

  const viajeInterno: ViajeInterno = d.viaje;
  const condicionesActivas: CondicionAbierta[] = d.condicionesActivas ?? [];
  // Req 4.1: el ETA solo se ofrece cuando el viaje NO está en estado terminal.
  const viajeTerminal = esTerminal(viajeInterno.estado as EstadoViaje);

  // Envío real de la transición (con causa opcional). Clasifica el 409 por el
  // código REAL devuelto por el wrapper (Req 3.3).
  const enviarTransicion = async (a_estado: EstadoViaje, causa?: string) => {
    try {
      await d.transicionar(a_estado, causa);
      addToast('Viaje transicionado correctamente', 'success');
    } catch (err) {
      if (err instanceof ErrorTransicion) {
        // Requirement 3.3: avisos de carrera (409) sin romper la UI
        if (err.codigo === 'transicion_no_permitida') {
          addToast('La transicion no es permitida en este estado.', 'error');
        } else if (err.codigo === 'viaje_en_estado_terminal') {
          addToast('No se puede transicionar un viaje terminal.', 'error');
        }
      } else {
        addToast('Error al transicionar el viaje.', 'error');
      }
      // Repropaga para que el modal de causa muestre el error en su campo.
      throw err;
    }
  };

  // Clic en una acción: si el destino requiere causa (Req 2.5), abre el modal
  // de causa; si no, envía la transición directo.
  const handleAccion = async (a_estado: EstadoViaje) => {
    if (requiereCausa(a_estado)) {
      setCausaPendiente(a_estado);
      return;
    }
    try {
      await enviarTransicion(a_estado);
    } catch {
      // Ya notificado por toast; sin modal que actualizar.
    }
  };

  // Confirmación desde el modal de causa.
  const handleCausaConfirm = async (causa: string) => {
    if (!causaPendiente) return;
    await enviarTransicion(causaPendiente, causa);
    setCausaPendiente(null);
  };

  const handleEtaConfirm = async (eta_estimado: string) => {
    try {
      await d.fijarEta(eta_estimado);
      setModalEtaAbierto(false);
      addToast('ETA actualizado correctamente', 'success');
    } catch (err) {
      if (err instanceof ErrorTransicion) {
        if (err.codigo === 'viaje_en_estado_terminal') {
          addToast('No se puede fijar ETA en un viaje terminal.', 'error');
        }
      } else {
        addToast('Error al guardar el ETA.', 'error');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4)' }}>
      <h1 className="ui-text-headline-lg" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
        Detalle del Viaje: {viajeInterno.id}
      </h1>

      {/* Cabecera: estado y condiciones en columnas separadas (P15, Req 1.2, 1.3) */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', gap: 'var(--ui-space-4)', alignItems: 'center' }}>
            {/* Estado */}
            <div>
              <p
                className="ui-text-body-xs"
                style={{ color: 'var(--ui-color-text-muted)', margin: '0 0 var(--ui-space-1) 0' }}
              >
                Estado
              </p>
              <Badge variant="neutral">{viajeInterno.estado}</Badge>
            </div>

            {/* Condiciones activas (P15, Req 2.1-2.4) */}
            {condicionesActivas.length > 0 && (
              <div>
                <p
                  className="ui-text-body-xs"
                  style={{ color: 'var(--ui-color-text-muted)', margin: '0 0 var(--ui-space-1) 0' }}
                >
                  Condiciones
                </p>
                <div style={{ display: 'inline-flex', gap: 'var(--ui-space-1)' }}>
                  {condicionesActivas.map((c) => (
                    <Badge key={c.tipo} variant={VARIANTE_CONDICION[c.tipo] ?? 'warning'} dot>
                      {c.tipo}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Informacion del viaje: origen, destinos, ETA */}
      <Card>
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-3)' }}>
            {/* Origen (ahora es un string de dirección) */}
            <div>
              <p
                className="ui-text-body-xs"
                style={{ color: 'var(--ui-color-text-muted)', margin: 0 }}
              >
                Origen
              </p>
              <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
                {viajeInterno.origen}
              </p>
            </div>

            {/* Destinos: bucle multi-parada (Req 1.4, 5.1) */}
            {viajeInterno.destinos && viajeInterno.destinos.length > 0 && (
              <div>
                <p
                  className="ui-text-body-xs"
                  style={{ color: 'var(--ui-color-text-muted)', margin: '0 0 var(--ui-space-1) 0' }}
                >
                  Paradas
                </p>
                {/* Fase del bucle derivada del estado canónico (Req 5.1). El
                    estado por parada no viene en el contrato; se muestra la fase
                    global en curso, no un marcador por destino. */}
                {viajeInterno.destinos.length > 1 && faseDelBucle(viajeInterno.estado) && (
                  <p
                    className="ui-text-body-xs"
                    style={{
                      color: 'var(--ui-color-text)',
                      margin: '0 0 var(--ui-space-2) 0',
                      fontStyle: 'italic',
                    }}
                  >
                    {faseDelBucle(viajeInterno.estado)}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-2)' }}>
                  {viajeInterno.destinos.map((destino, idx) => (
                    <div
                      key={destino.numero_envio ?? `parada-${idx}`}
                      style={{
                        padding: 'var(--ui-space-2)',
                        border: '1px solid var(--ui-color-border)',
                        borderRadius: 'var(--ui-radius-sm)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: 'var(--ui-space-2)',
                          alignItems: 'center',
                          marginBottom: 'var(--ui-space-1)',
                        }}
                      >
                        <span
                          className="ui-text-body-xs"
                          style={{ color: 'var(--ui-color-text-muted)' }}
                        >
                          Parada {idx + 1}
                        </span>
                      </div>
                      <p
                        className="ui-text-body-sm"
                        style={{ color: 'var(--ui-color-text)', margin: '0 0 var(--ui-space-1) 0' }}
                      >
                        <strong>{destino.nombre}</strong>
                      </p>
                      {destino.numero_envio && (
                        <p
                          className="ui-text-body-xs"
                          style={{ color: 'var(--ui-color-text-muted)', margin: 0 }}
                        >
                          Envío: {destino.numero_envio}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ETA estimado: marca "no en vivo" */}
            {viajeInterno.eta_estimado && (
              <div>
                <p
                  className="ui-text-body-xs"
                  style={{ color: 'var(--ui-color-text-muted)', margin: 0 }}
                >
                  ETA estimado (no en vivo)
                </p>
                <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
                  {new Date(viajeInterno.eta_estimado).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Acciones: lista de botones derivados del hook (Req 1.2, 3.1, 3.2) */}
      {d.acciones.length > 0 && (
        <Card>
          <CardHeader>
            <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
              Acciones disponibles
            </p>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-2)' }}>
              {d.acciones.map((accion) => (
                <Button
                  key={accion}
                  variant="primary"
                  onClick={() => void handleAccion(accion)}
                  style={{ width: '100%' }}
                >
                  Transicionar a: {accion}
                  {requiereCausa(accion) ? ' (requiere causa)' : ''}
                </Button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Formulario de ETA (Req 4.1): solo se ofrece si el viaje NO es terminal. */}
      {!viajeTerminal && (
        <Card>
          <CardHeader>
            <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
              Fijar ETA manual
            </p>
          </CardHeader>
          <CardBody>
            <p
              className="ui-text-body-xs"
              style={{ color: 'var(--ui-color-text-muted)', margin: 0 }}
            >
              Ingresa una hora estimada de llegada. Este valor es indicativo, no en vivo.
            </p>
          </CardBody>
          <CardFooter>
            <Button variant="secondary" onClick={() => setModalEtaAbierto(true)}>
              Editar ETA
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Modal para ETA */}
      <Modal
        open={modalEtaAbierto}
        onClose={() => setModalEtaAbierto(false)}
        title="Fijar ETA manual"
      >
        <EtaForm
          etaActual={viajeInterno.eta_estimado ?? undefined}
          onConfirm={handleEtaConfirm}
          onCancel={() => setModalEtaAbierto(false)}
        />
      </Modal>

      {/* Modal de causa para transiciones que la requieren (Req 2.5) */}
      <Modal
        open={causaPendiente !== null}
        onClose={() => setCausaPendiente(null)}
        title="Confirmar transición"
      >
        {causaPendiente && (
          <CausaForm
            destino={causaPendiente}
            onConfirm={handleCausaConfirm}
            onCancel={() => setCausaPendiente(null)}
          />
        )}
      </Modal>

      {/* Toast para avisos de carrera, exito y error (Req 4.1, 4.3, 6.2) */}
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

/**
 * Estado de carga (Req 5.1).
 */
function EstadoCargando() {
  return (
    <Card>
      <CardBody>
        <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
          Cargando detalles del viaje...
        </p>
      </CardBody>
    </Card>
  );
}

/**
 * Estado de error con accion de reintento (Req 7.1, 7.2).
 */
function EstadoError({ onReintentar }: { readonly onReintentar: () => void }) {
  return (
    <Card variant="outlined">
      <CardBody>
        <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
          No se pudo cargar el detalle del viaje.
        </p>
      </CardBody>
      <CardFooter>
        <Button variant="primary" onClick={onReintentar}>
          Reintentar
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Estado vacio: no hay datos tras carga (Req 6.1).
 */
function EstadoVacio() {
  return (
    <Card>
      <CardBody>
        <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text-muted)', margin: 0 }}>
          No hay datos disponibles para este viaje.
        </p>
      </CardBody>
    </Card>
  );
}

/**
 * Delegacion de sesion en 401 (Req 7.3).
 */
function DelegacionSesion() {
  const { logout } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      await logout();
      void navigate({ to: '/login', search: { redirect: '/viajes' } });
    })();
  }, [logout, navigate]);

  return null;
}
