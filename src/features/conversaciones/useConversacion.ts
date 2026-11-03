import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import {
  enviarMensaje,
  listarMensajes,
  obtenerConversacion,
  reclamarConversacion,
  liberarReclamo,
  marcarAtendida,
  registrarReciboLeido,
} from '@/lib/api/conversaciones';
import type { Conversacion, Mensaje } from '@/lib/contracts/conversaciones';
import { ApiError } from '@/lib/api/errors';
import { aplicarMensajes } from './aplicarCambios';
import { crearPolling } from './actualizacion';

type AccionEnCurso = 'reclamar' | 'devolver' | 'atendida';

export function useConversacion(id: string | undefined) {
  const { sesion } = useSession();
  const token = sesion?.accessToken ?? '';
  const sujetoId = sesion?.usuario.id;
  const [conversacion, setConversacion] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [hayMensajesAnteriores, setHayMensajesAnteriores] = useState(false);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorAccion, setErrorAccion] = useState<Error | null>(null);
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [accionEnCurso, setAccionEnCurso] = useState<AccionEnCurso | null>(null);
  const [desactualizada, setDesactualizada] = useState(false);
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);
  const clientMessageId = useRef<string | null>(null);
  const ultimaSecuencia = useRef<number | undefined>(undefined);
  const accionEnCursoRef = useRef<AccionEnCurso | null>(null);

  const iniciarAccion = useCallback((accion: AccionEnCurso) => {
    if (accionEnCursoRef.current) return false;
    accionEnCursoRef.current = accion;
    setAccionEnCurso(accion);
    return true;
  }, []);

  const finalizarAccion = useCallback(() => {
    accionEnCursoRef.current = null;
    setAccionEnCurso(null);
  }, []);

  const recargar = useCallback(
    async (preservarHistorial = false) => {
      if (!id) return;
      setCargando(true);
      setError(null);
      if (!preservarHistorial) setErrorAccion(null);
      try {
        const [detalle, pagina] = await Promise.all([
          obtenerConversacion(id, token),
          listarMensajes(id, token),
        ]);
        setConversacion(detalle);
        setMensajes((old) =>
          preservarHistorial
            ? aplicarMensajes(old, pagina.items)
            : aplicarMensajes([], pagina.items),
        );
        setHayMensajesAnteriores(pagina.hay_mas);
        setDesactualizada(false);
        setActualizadoEn(new Date());
        ultimaSecuencia.current = detalle.ultima_secuencia;
      } catch (e) {
        setError(e instanceof Error ? e : new Error('No se pudo cargar la conversación'));
      } finally {
        setCargando(false);
      }
    },
    [id, token],
  );

  // La carga inicial sincroniza una fuente externa (BFF) con el estado local.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recargar();
  }, [recargar]);

  // Recibo de lectura (Req 8.8): solo el reclamante activo y solo cuando avanza la
  // última secuencia leída. Las dependencias son primitivas: cada vuelta de polling
  // crea un objeto `conversacion` nuevo y no debe reenviar el recibo.
  const vigente = conversacion?.id === id ? conversacion : undefined;
  const ultimaSecuenciaConversacion = vigente?.ultima_secuencia;
  const esReclamanteActivo =
    vigente?.reclamo_activo?.responsable_id !== undefined &&
    vigente.reclamo_activo.responsable_id === sujetoId;
  const reciboEnviado = useRef<{ id: string; secuencia: number } | null>(null);
  useEffect(() => {
    if (!id || !esReclamanteActivo || ultimaSecuenciaConversacion === undefined) return;
    const previo = reciboEnviado.current;
    if (previo?.id === id && previo.secuencia >= ultimaSecuenciaConversacion) return;
    reciboEnviado.current = { id, secuencia: ultimaSecuenciaConversacion };
    // El recibo no debe ocultar la conversación ni bloquear su lectura.
    void registrarReciboLeido(id, { hasta_secuencia: ultimaSecuenciaConversacion }, token).catch(
      () => undefined,
    );
  }, [esReclamanteActivo, id, token, ultimaSecuenciaConversacion]);

  const conversacionId = conversacion?.id;
  useEffect(() => {
    if (!id || !conversacionId) return;
    const polling = crearPolling(async () => {
      try {
        const pagina = await listarMensajes(
          id,
          token,
          ultimaSecuencia.current === undefined ? {} : { despuesDe: ultimaSecuencia.current },
        );
        setMensajes((old) => aplicarMensajes(old, pagina.items));
        const detalle = await obtenerConversacion(id, token);
        setConversacion(detalle);
        ultimaSecuencia.current = detalle.ultima_secuencia;
        setActualizadoEn(new Date());
        setDesactualizada(false);
        setError(null);
      } catch (e) {
        setDesactualizada(true);
        setError(e instanceof Error ? e : new Error('No se pudo actualizar la conversación'));
      }
    });
    polling.iniciar();
    return () => polling.detener();
  }, [conversacionId, id, token]);

  const cargarAnteriores = useCallback(async () => {
    const primero = mensajes[0];
    if (!id || !primero || !hayMensajesAnteriores || cargandoAnteriores) return;
    setCargandoAnteriores(true);
    try {
      const pagina = await listarMensajes(id, token, { antesDe: primero.secuencia });
      setMensajes((old) => aplicarMensajes(old, pagina.items));
      setHayMensajesAnteriores(pagina.hay_mas);
      setActualizadoEn(new Date());
      setDesactualizada(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('No se pudo cargar el historial anterior'));
    } finally {
      setCargandoAnteriores(false);
    }
  }, [cargandoAnteriores, hayMensajesAnteriores, id, mensajes, token]);

  const falloAccion = useCallback(
    async (e: unknown) => {
      const accionError = e instanceof Error ? e : new Error('No se pudo completar la acción');
      if (e instanceof ApiError && (e.status === 403 || e.status === 409)) await recargar(true);
      setErrorAccion(accionError);
    },
    [recargar],
  );

  const reclamar = useCallback(async () => {
    if (!id || !conversacion || !iniciarAccion('reclamar')) return;
    try {
      await reclamarConversacion(id, { version_esperada: conversacion.version_reclamo }, token);
      await recargar(true);
      setErrorAccion(null);
    } catch (e) {
      await falloAccion(e);
    } finally {
      finalizarAccion();
    }
  }, [conversacion, falloAccion, finalizarAccion, id, iniciarAccion, recargar, token]);

  const devolver = useCallback(async () => {
    if (!id || !conversacion?.reclamo_activo || !iniciarAccion('devolver')) return;
    try {
      await liberarReclamo(id, conversacion.reclamo_activo.id, conversacion.version_reclamo, token);
      await recargar(true);
      setErrorAccion(null);
    } catch (e) {
      await falloAccion(e);
    } finally {
      finalizarAccion();
    }
  }, [conversacion, falloAccion, finalizarAccion, id, iniciarAccion, recargar, token]);

  const atendida = useCallback(async () => {
    if (!id || !conversacion || !iniciarAccion('atendida')) return;
    try {
      await marcarAtendida(id, { version_esperada: conversacion.version_reclamo }, token);
      await recargar(true);
      setErrorAccion(null);
    } catch (e) {
      await falloAccion(e);
    } finally {
      finalizarAccion();
    }
  }, [conversacion, falloAccion, finalizarAccion, id, iniciarAccion, recargar, token]);

  const enviar = useCallback(
    async (cuerpo: string) => {
      if (!id || !conversacion || !cuerpo.trim()) return;
      setEnviando(true);
      clientMessageId.current ??= crypto.randomUUID();
      try {
        const message = await enviarMensaje(
          id,
          {
            client_message_id: clientMessageId.current,
            cuerpo: cuerpo.trim(),
            version_reclamo_esperada: conversacion.version_reclamo,
          },
          token,
        );
        setMensajes((old) => aplicarMensajes(old, [message]));
        setBorrador('');
        clientMessageId.current = null;
        setErrorAccion(null);
      } catch (e) {
        await falloAccion(e);
      } finally {
        setEnviando(false);
      }
    },
    [conversacion, falloAccion, id, token],
  );

  return {
    conversacion,
    mensajes,
    hayMensajesAnteriores,
    cargandoAnteriores,
    cargarAnteriores,
    cargando,
    error: errorAccion ?? error,
    borrador,
    setBorrador,
    enviando,
    accionEnCurso,
    desactualizada,
    actualizadoEn,
    recargar,
    reclamar,
    devolver,
    atendida,
    enviar,
  };
}
