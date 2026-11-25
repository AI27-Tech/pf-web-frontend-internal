/*
 * Presentacion del detalle del viaje -- avance y ETA manual (E8-T8).
 *
 * Compone la pantalla del detalle: cabecera con estado y condiciones, lista de
 * acciones, formulario de ETA, y avisos de carrera/error con Toast.
 *
 * Ramifica el 401 (delega al AppShell sin pintar error) y el 403 (sin permiso,
 * sin cerrar sesión) antes del error generico.
 * Estado de carga y error con opcion de reintento. Bucle multi-parada visible
 * desde los destinos del detalle (nombre + numero_envio).
 *
 * Solo componentes de @ai27-tech/ui: Badge, Button, Modal, Card, Toast, etc.
 * No crea componentes nuevos; afordancia faltante se reporta como brecha.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { CalendarClock, Clock } from 'lucide-react';

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  EmptyState,
  Skeleton,
  SkeletonText,
  Grid,
  Timeline,
  Modal,
  Stat,
  Stack,
  Toast,
  ToastContainer,
} from '@ai27-tech/ui';
import { BloqueError } from '@/components/feedback/BloqueError';
import { useSession } from '@/context/SessionContext';
import { ApiError, esNoEncontrado, esProhibido } from '@/lib/api/errors';
import { ErrorAsignacion, ErrorTransicion } from '@/lib/api/viajeDetalle';
import type { CondicionAbierta, ViajeInterno } from '@/lib/contracts/viajeDetalle';
import { EstadoViaje, esTerminal } from '@/lib/contracts/viajeDetalle';
import type { MotivoCierre } from '@/lib/contracts/cierreViaje';

import { CausaForm } from './causaForm';
import { CierreForm } from './cierreForm';
import { bloqueoDeCierre, tipoDeCierre, ventanaTrasCierre } from './cierreViaje';
import { accionesPermitidas } from './accionesTransicion';
import { requiereCausa } from './causaTransicion';
import { AsignacionForm } from './asignacionForm';
import { EtaForm } from './etaForm';
import { nombreEstado, pasosSeguimiento, siguientePaso } from './seguimiento';
import { FechaHoraForm } from './fechaHoraForm';
import { useDetalleViaje } from './useDetalleViaje';
import styles from './progresoViaje.module.css';
import { SeccionEmergenciasViaje } from '@/features/emergencias/activacion/SeccionEmergenciasViaje';
import { AlertaEmergenciasActivas } from '@/features/emergencias/activacion/AlertaEmergenciasActivas';
import { useEmergenciasViaje } from '@/features/emergencias/activacion/useEmergenciasViaje';
import { puede } from '@/lib/permisos';
import { useActivacionEmergencia } from '@/features/viajes/activacionEmergenciaContexto';
import { AvisoActivacionEmergencia } from '@/features/viajes/AvisoActivacionEmergencia';

export interface DetalleViajeProps {
  readonly id: string;
}

/** Variante de Badge por condicion. */

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

/** Avisos de un `403` y un `404` al ejecutar una acción (Requirement T2.3 y T2.4). */
const MENSAJE_ACCION_SIN_PERMISO = 'No tienes permiso para realizar esta acción.';
const MENSAJE_VIAJE_NO_DISPONIBLE = 'Este viaje ya no está disponible.';

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
 * 2. Si 403: avisa la falta de permiso, sin cerrar la sesion
 * 3. Si otro error: muestra Card + boton reintento
 * 4. Si cargando y sin datos: indicador de carga
 * 5. Si datos: renderiza cabecera, acciones, modal, ETA, avisos
 */
export function DetalleViaje({ id }: DetalleViajeProps) {
  const { casoActivado } = useActivacionEmergencia();
  const { usuario } = useSession();
  const navigate = useNavigate();
  // Una sola lista de casos para la alerta y el carril. Solo roles con carril la piden.
  const tieneCarril = puede(usuario?.rol, 'emergencia.verDeViaje');
  const emergencias = useEmergenciasViaje(id, { habilitado: tieneCarril });
  /** true cuando el modal de selección de unidades está abierto (E8-T10). */
  const [modalAsignacionAbierto, setModalAsignacionAbierto] = useState(false);
  const d = useDetalleViaje(id, { habilitarRoster: modalAsignacionAbierto });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [modalEtaAbierto, setModalEtaAbierto] = useState(false);
  /** true si el modal de completar fecha/hora del servicio está abierto (E8-T9). */
  const [modalFechaHoraAbierto, setModalFechaHoraAbierto] = useState(false);
  /** Destino pendiente de confirmar con causa; null si no hay modal de causa abierto. */
  const [causaPendiente, setCausaPendiente] = useState<EstadoViaje | null>(null);
  /** true cuando el modal de motivo de cierre está abierto (E8-T14). */
  const [cierreAbierto, setCierreAbierto] = useState(false);
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

  // Un 403 no es sesión vencida: se dice y la sesión sigue.
  if (d.esProhibido) {
    return <SinPermiso />;
  }

  // Un 404 es "no encontrado" (no existe o queda fuera del alcance): no sugiere un permiso.
  if (d.esNoEncontrado) {
    return <ViajeNoEncontrado />;
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
  const tipoCierre = tipoDeCierre(viajeInterno.estado as EstadoViaje);
  const bloqueoCierre = tipoCierre
    ? bloqueoDeCierre(viajeInterno.estado as EstadoViaje, condicionesActivas)
    : null;
  // Estado y rol: la máquina de estados fija las aristas y la política, las que ejerce el rol (M4).
  const accionesVisibles = accionesPermitidas(d.acciones, usuario?.rol);
  const puedeFijarEta = puede(usuario?.rol, 'viaje.eta') && !viajeTerminal;

  // 403 y 404 comunes a toda acción (T2.3, T2.4): avisa con Toast y deja la pantalla intacta;
  // si el viaje ya no existe para el usuario, vuelve a la lista. Devuelve true si lo atendió.
  const avisarFalloDeAccion = (err: unknown): boolean => {
    if (esProhibido(err)) {
      addToast(MENSAJE_ACCION_SIN_PERMISO, 'error');
      return true;
    }
    if (esNoEncontrado(err)) {
      addToast(MENSAJE_VIAJE_NO_DISPONIBLE, 'error');
      void navigate({ to: '/viajes' });
      return true;
    }
    return false;
  };

  // Envío real de la transición (con causa opcional). Clasifica el 409 por el
  // código REAL devuelto por el wrapper (Req 3.3).
  const enviarTransicion = async (a_estado: EstadoViaje, causa?: string) => {
    try {
      await d.transicionar(a_estado, causa);
      addToast('Viaje transicionado correctamente', 'success');
    } catch (err) {
      if (avisarFalloDeAccion(err)) {
        // 403 y 404 ya avisados (E8): el detalle queda intacto.
      } else if (err instanceof ErrorTransicion) {
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

  // Clic en una acción: si el destino requiere causa (Req 2.5 / 4.1), abre el
  // modal de causa; si no, envía la transición directo.
  const handleAccion = async (a_estado: EstadoViaje) => {
    // CERRADO requiere motivo_cierre; nunca se envía como transición genérica.
    if (a_estado === EstadoViaje.Cerrado) {
      setCierreAbierto(true);
      return;
    }

    // ASIGNADO es la acción de reservar la escolta; la transición se confirma
    // atómicamente junto con las unidades seleccionadas por el formulario.
    if (a_estado === EstadoViaje.Asignado) {
      setModalAsignacionAbierto(true);
      return;
    }

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

  // Confirmación de la asignación atómica de la escolta (E8-T10).
  const handleAsignacionConfirm = async (unidades_ids: string[]) => {
    if (unidades_ids.length === 0) {
      throw new Error('Selecciona al menos una unidad para asignar.');
    }

    try {
      await d.asignarEscolta(unidades_ids);
      setModalAsignacionAbierto(false);
      addToast('Escolta asignada correctamente', 'success');
    } catch (err) {
      if (err instanceof ErrorAsignacion) {
        // Mensaje de carrera: es distinto del estado de roster vacío.
        addToast('La asignación no pudo completarse: otro operador reservó una unidad.', 'error');
      } else if (err instanceof ApiError && err.kind === 'prohibido') {
        const mensaje = 'No tienes permiso para asignar la escolta de este viaje.';
        addToast(mensaje, 'error');
        throw new Error(mensaje, { cause: err });
      } else if (avisarFalloDeAccion(err)) {
        // 404: el viaje ya no está disponible; se avisó y se volvió a la lista.
      } else if (!(err instanceof ApiError && err.kind === 'noAutorizado')) {
        addToast('No se pudo asignar la escolta.', 'error');
      }
      // El formulario conserva la selección y muestra el error contextual.
      throw err;
    }
  };

  // Confirmación del cierre del servicio (E8-T14).
  const handleCierreConfirm = async (motivo: MotivoCierre) => {
    try {
      await d.cerrarServicio(motivo);
      setCierreAbierto(false);
      addToast(
        `Servicio cerrado. La conversación aceptará mensajes durante ${ventanaTrasCierre(motivo)} y después pasará a sólo lectura.`,
        'success',
      );
    } catch (err) {
      let mensaje = 'No se pudo cerrar el servicio. Revisa tu conexión e inténtalo de nuevo.';

      if (err instanceof ErrorTransicion) {
        if (err.codigo === 'cierre_anticipado_requiere_incidencia') {
          mensaje = 'El cierre anticipado requiere una incidencia abierta';
        } else if (err.codigo === 'cierre_anticipado_solo_por_incidencia') {
          mensaje = 'El cierre anticipado solo es válido por incidencia';
        } else {
          // Incluye el `conflicto` que el runtime actual usa como código genérico.
          mensaje =
            'El cierre no es posible en el estado actual del viaje. Se actualizó el detalle; puedes reintentar.';
        }
        addToast(mensaje, 'error');
      } else if (err instanceof ApiError && err.status === 400) {
        mensaje = 'El motivo de cierre no es válido';
        addToast(mensaje, 'error');
      } else if (err instanceof ApiError && err.status === 403) {
        mensaje = 'El cierre requiere Jefe Operativo o Administrador';
        addToast(mensaje, 'error');
      } else if (avisarFalloDeAccion(err)) {
        mensaje = MENSAJE_VIAJE_NO_DISPONIBLE;
      } else {
        addToast(mensaje, 'error');
      }

      // El formulario conserva el motivo y pinta este mensaje en su campo.
      throw new Error(mensaje, { cause: err });
    }
  };

  const handleEtaConfirm = async (eta_estimado: string) => {
    try {
      await d.fijarEta(eta_estimado);
      setModalEtaAbierto(false);
      addToast('ETA actualizado correctamente', 'success');
    } catch (err) {
      if (avisarFalloDeAccion(err)) {
        // 403 y 404 ya avisados.
      } else if (err instanceof ErrorTransicion) {
        if (err.codigo === 'viaje_en_estado_terminal') {
          addToast('No se puede fijar ETA en un viaje terminal.', 'error');
        }
      } else {
        addToast('Error al guardar el ETA.', 'error');
      }
    }
  };

  // Confirmación desde el modal de corregir fecha/hora (E8-T9, Req 3.3-3.4).
  // Al confirmar, la lectura se invalida y `fecha_hora_servicio` queda reflejada.
  const handleFechaHoraConfirm = async (fecha_hora_servicio: string) => {
    try {
      await d.completarFechaHora(fecha_hora_servicio);
      setModalFechaHoraAbierto(false);
      addToast('Fecha y hora del servicio registrada', 'success');
    } catch (err) {
      if (avisarFalloDeAccion(err)) {
        // 403 y 404 ya avisados.
      } else if (err instanceof ErrorTransicion) {
        addToast('No se pudo registrar la fecha y hora.', 'error');
      } else {
        addToast('Error al guardar la fecha y hora.', 'error');
      }
      // Repropaga para que el formulario muestre el error en su campo.
      throw err;
    }
  };

  const incidenciaAbierta = condicionesActivas.find((c) => c.tipo === 'INCIDENCIA');
  // Corregir la fecha y hora del servicio: JO y ADM, mientras el viaje no sea terminal (M4).
  const puedeCorregirFechaHora = puede(usuario?.rol, 'viaje.fechaHora') && !viajeTerminal;

  const siguienteEstado = siguientePaso(viajeInterno.estado);
  const accionPrincipal: EstadoViaje | undefined =
    accionesVisibles.find((a) => a === siguienteEstado) ??
    accionesVisibles.find((a) => !requiereCausa(a));
  const secundarias = accionesVisibles.filter((a) => a !== accionPrincipal && !requiereCausa(a));
  const destructivas = accionesVisibles.filter((a) => requiereCausa(a));
  const motivoBloqueo = (a: EstadoViaje): string | null => {
    if (a === EstadoViaje.Cerrado && bloqueoCierre) return bloqueoCierre;
    return null;
  };

  return (
    <Stack gap={4}>
      {/* Incidencia abierta: aviso arriba del detalle, con enlace al histórico (E8-T8). */}
      {incidenciaAbierta && (
        <Alert variant="warning">
          {`Incidencia abierta desde ${new Date(incidenciaAbierta.abierta_en).toLocaleString()}. `}
          <Link
            to="/viajes/$id/historico"
            params={{ id }}
            style={{ color: 'var(--ui-color-primary)', textDecoration: 'underline' }}
          >
            Ver histórico
          </Link>
        </Alert>
      )}
      {/* Emergencias abiertas del viaje, junto a la alerta de incidencia. */}
      <AlertaEmergenciasActivas casos={emergencias.casos} />
      {/* Error de la última activación. */}
      <AvisoActivacionEmergencia />

      <Card>
        <CardHeader>
          <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
            Progreso
          </p>
        </CardHeader>
        <CardBody>
          <Timeline
            className={styles.progreso}
            orientation="horizontal"
            items={pasosSeguimiento(viajeInterno.estado)}
            minItemWidth="6rem"
            stackBelow={640}
            aria-label="Progreso del viaje"
          />
        </CardBody>
      </Card>

      <Grid minItemWidth="22rem" gap={4}>
        <Stack gap={4}>
          <Grid minItemWidth="12rem" gap={4}>
            <Stat
              label="Fecha y hora del servicio"
              value={
                viajeInterno.fecha_hora_servicio
                  ? new Date(viajeInterno.fecha_hora_servicio).toLocaleString()
                  : 'Sin fecha'
              }
              icon={<CalendarClock size={18} aria-hidden="true" />}
            />
            <Stat
              label="ETA estimado (no en vivo)"
              value={
                viajeInterno.eta_estimado
                  ? new Date(viajeInterno.eta_estimado).toLocaleString()
                  : 'Sin ETA'
              }
              helpText="Valor indicativo"
              icon={<Clock size={18} aria-hidden="true" />}
            />
          </Grid>

          <Card>
            <CardHeader>
              <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
                Ruta
              </p>
            </CardHeader>
            <CardBody>
              <Stack gap={3}>
                <div>
                  <p
                    className="ui-text-body-xs"
                    style={{ color: 'var(--ui-color-text-muted)', margin: 0 }}
                  >
                    Origen
                  </p>
                  <p
                    className="ui-text-body-sm"
                    style={{ color: 'var(--ui-color-text)', margin: 0 }}
                  >
                    {viajeInterno.origen}
                  </p>
                </div>
                {viajeInterno.destinos.map((destino, indice) => (
                  <div key={destino.numero_envio ?? `parada-${indice}`}>
                    <p
                      className="ui-text-body-xs"
                      style={{ color: 'var(--ui-color-text-muted)', margin: 0 }}
                    >
                      Parada {indice + 1}
                    </p>
                    <p
                      className="ui-text-body-sm"
                      style={{ color: 'var(--ui-color-text)', margin: 0 }}
                    >
                      {destino.nombre}
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
              </Stack>
              {viajeInterno.destinos.length > 1 && faseDelBucle(viajeInterno.estado) && (
                <p
                  className="ui-text-body-xs"
                  style={{
                    color: 'var(--ui-color-text)',
                    margin: 'var(--ui-space-2) 0 0 0',
                    fontStyle: 'italic',
                  }}
                >
                  {faseDelBucle(viajeInterno.estado)}
                </p>
              )}
            </CardBody>
          </Card>

          {puedeCorregirFechaHora && (
            <Card variant="outlined">
              <CardBody>
                <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
                  {viajeInterno.fecha_hora_servicio
                    ? 'Puedes corregir la fecha y hora del servicio.'
                    : 'Falta la fecha y hora del servicio.'}
                </p>
              </CardBody>
              <CardFooter>
                <Button variant="secondary" onClick={() => setModalFechaHoraAbierto(true)}>
                  {viajeInterno.fecha_hora_servicio
                    ? 'Corregir fecha y hora'
                    : 'Completar fecha y hora'}
                </Button>
              </CardFooter>
            </Card>
          )}

          {viajeInterno.estado === EstadoViaje.Cerrado && (
            <Card variant="outlined">
              <CardBody>
                <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
                  Este viaje está cerrado.
                </p>
              </CardBody>
            </Card>
          )}
        </Stack>

        <Stack gap={4}>
          {/* Acciones: CERRADO tiene un flujo dedicado con motivo obligatorio (E8-T14). */}
          {accionesVisibles.length > 0 && (
            <Card>
              <CardHeader>
                <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text)', margin: 0 }}>
                  Acciones
                </p>
              </CardHeader>
              <CardBody>
                <Stack gap={3}>
                  {accionPrincipal && (
                    <BotonAccion
                      etiqueta={etiquetaAccion(accionPrincipal, true)}
                      variante="primary"
                      motivo={motivoBloqueo(accionPrincipal)}
                      onClick={() => void handleAccion(accionPrincipal)}
                    />
                  )}
                  {secundarias.map((accion) => (
                    <BotonAccion
                      key={accion}
                      etiqueta={etiquetaAccion(accion, false)}
                      variante="secondary"
                      motivo={motivoBloqueo(accion)}
                      onClick={() => void handleAccion(accion)}
                    />
                  ))}
                  {destructivas.length > 0 && (
                    <>
                      <Divider />
                      {destructivas.map((accion) => (
                        <BotonAccion
                          key={accion}
                          etiqueta={etiquetaAccion(accion, false)}
                          variante="danger"
                          motivo={motivoBloqueo(accion)}
                          onClick={() => void handleAccion(accion)}
                        />
                      ))}
                    </>
                  )}
                </Stack>
              </CardBody>
            </Card>
          )}

          {/* Formulario de ETA (Req 4.1): solo si el viaje NO es terminal y el rol puede fijarlo (M4). */}
          {puedeFijarEta && (
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

          {/* Modal de selección y asignación de la escolta (E8-T10). */}
          <SeccionEmergenciasViaje
            viajeId={id}
            rol={usuario?.rol ?? null}
            casoActivado={casoActivado}
            emergencias={emergencias}
          />
        </Stack>
      </Grid>
      <Modal
        open={modalAsignacionAbierto}
        onClose={() => setModalAsignacionAbierto(false)}
        title="Asignar escolta"
      >
        <AsignacionForm
          unidades={d.unidades}
          cargando={d.cargandoUnidades}
          error={d.errorUnidades}
          enviando={d.asignandoEscolta}
          onConfirm={handleAsignacionConfirm}
          onCancel={() => setModalAsignacionAbierto(false)}
          onReintentar={d.reintentarUnidades}
        />
      </Modal>

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

      {/* Modal de completar fecha/hora del servicio (E8-T9, Req 3.1) */}
      <Modal
        open={modalFechaHoraAbierto}
        onClose={() => setModalFechaHoraAbierto(false)}
        title="Completar fecha y hora del servicio"
      >
        <FechaHoraForm
          fechaHoraActual={viajeInterno.fecha_hora_servicio ?? undefined}
          onConfirm={handleFechaHoraConfirm}
          onCancel={() => setModalFechaHoraAbierto(false)}
        />
      </Modal>

      {/* Modal de cierre del servicio (E8-T14). */}
      <Modal open={cierreAbierto} onClose={() => setCierreAbierto(false)} title="Cerrar servicio">
        {tipoCierre && (
          <CierreForm
            tipo={tipoCierre}
            onConfirm={handleCierreConfirm}
            onCancel={() => setCierreAbierto(false)}
          />
        )}
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
    </Stack>
  );
}

/**
 * Estado de carga (Req 5.1).
 */
function EstadoCargando() {
  return (
    <div role="status" aria-label="Cargando detalles del viaje">
      <Stack gap={4}>
        <Card>
          <CardHeader>
            <SkeletonText lines={1} />
          </CardHeader>
          <CardBody>
            <Skeleton width="100%" height="1.5rem" />
          </CardBody>
        </Card>
        <Grid minItemWidth="12rem" gap={4}>
          <Card>
            <CardBody>
              <SkeletonText lines={2} />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <SkeletonText lines={2} />
            </CardBody>
          </Card>
        </Grid>
        <Grid minItemWidth="22rem" gap={4}>
          <Stack gap={4}>
            <Card>
              <CardHeader>
                <SkeletonText lines={1} />
              </CardHeader>
              <CardBody>
                <SkeletonText lines={4} />
              </CardBody>
            </Card>
          </Stack>
          <Stack gap={4}>
            <Card>
              <CardHeader>
                <SkeletonText lines={1} />
              </CardHeader>
              <CardBody>
                <SkeletonText lines={3} />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <SkeletonText lines={2} />
              </CardBody>
            </Card>
          </Stack>
        </Grid>
      </Stack>
    </div>
  );
}

/**
 * Estado de error con accion de reintento (Req 7.1, 7.2).
 */
function EstadoError({ onReintentar }: { readonly onReintentar: () => void }) {
  return (
    <BloqueError mensaje="No se pudo cargar el detalle del viaje." onReintentar={onReintentar} />
  );
}

/**
 * Sin permiso (403): la sesión es válida pero el rol no tiene acceso a este viaje.
 * El alcance responde 404, no 403 (Requirement T2.6).
 */
function SinPermiso() {
  return <Alert variant="danger">No tienes permiso para ver el detalle de este viaje.</Alert>;
}

/**
 * No encontrado (404): el viaje no existe o no es visible para este usuario. No sugiere un
 * permiso faltante (Requirement T2.2).
 */
function ViajeNoEncontrado() {
  return (
    <Card>
      <CardBody>
        <EmptyState
          role="status"
          title="Viaje no encontrado"
          description="Revisa el identificador o vuelve a la lista de viajes."
          action={
            <Link to="/viajes" className="ui-text-body-sm">
              Volver a viajes
            </Link>
          }
        />
      </CardBody>
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
        <EmptyState size="sm" title="No hay datos disponibles para este viaje." />
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

/** Etiqueta de una transición: la principal avanza, las demás pasan al estado indicado. */
function etiquetaAccion(accion: EstadoViaje, principal: boolean): string {
  if (accion === EstadoViaje.Asignado) return 'Asignar escolta';
  if (accion === EstadoViaje.Cerrado) return 'Cerrar servicio';
  return principal ? `Avanzar a: ${nombreEstado(accion)}` : `Pasar a: ${nombreEstado(accion)}`;
}

/** Botón de una transición, con el motivo de bloqueo debajo cuando no se puede ejecutar. */
function BotonAccion({
  etiqueta,
  variante,
  motivo,
  onClick,
}: {
  readonly etiqueta: string;
  readonly variante: 'primary' | 'secondary' | 'danger';
  readonly motivo: string | null;
  readonly onClick: () => void;
}) {
  return (
    <div>
      <Button
        variant={variante}
        onClick={onClick}
        disabled={motivo !== null}
        style={{ width: '100%' }}
      >
        {etiqueta}
      </Button>
      {motivo && (
        <p
          className="ui-text-body-xs"
          style={{ color: 'var(--ui-color-text-muted)', margin: 'var(--ui-space-1) 0 0' }}
        >
          {motivo}
        </p>
      )}
    </div>
  );
}
