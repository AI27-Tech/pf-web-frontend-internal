import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import {
  esSesionFinalizada,
  listarNotasEmergencia,
  obtenerEmergencia,
} from '@/lib/api/emergencias';
import type { DetalleEmergenciaReaccion, NotaEmergencia } from '@/lib/contracts/emergencias';
import { crearPollingEmergencias } from './actualizacion';
import { describirCambio } from './etiquetas';

/**
 * Detalle y notas de un caso. Se actualiza por polling. Un fallo conserva lo ya mostrado
 * y marca la vista como desactualizada (Req 10.4). Si cambia el estado o el responsable
 * en una consulta, deja un texto para anunciarlo (Req 10.8).
 */
export function useCasoEmergencia(eid: string | undefined) {
  const { sesion, usuario } = useSession();
  const token = sesion?.accessToken ?? '';
  const sujetoId = usuario?.id ?? '';
  const [detalle, setDetalle] = useState<DetalleEmergenciaReaccion | null>(null);
  const [notas, setNotas] = useState<NotaEmergencia[]>([]);
  const [cursorNotas, setCursorNotas] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoMasNotas, setCargandoMasNotas] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);
  const [desactualizada, setDesactualizada] = useState(false);
  const [anuncio, setAnuncio] = useState('');
  const detalleRef = useRef<DetalleEmergenciaReaccion | null>(null);

  const cargar = useCallback(async () => {
    if (!eid) return;
    try {
      const [caso, pagina] = await Promise.all([
        obtenerEmergencia(eid, token),
        listarNotasEmergencia(eid, token),
      ]);
      const previo = detalleRef.current;
      if (previo) {
        const texto = describirCambio(previo.caso, caso.caso, sujetoId);
        if (texto) setAnuncio(texto);
      }
      detalleRef.current = caso;
      setDetalle(caso);
      setNotas(pagina.items);
      setCursorNotas(pagina.cursor_siguiente);
      setActualizadoEn(new Date());
      setDesactualizada(false);
      setError(null);
    } catch (e) {
      // Una sesión finalizada la maneja el AppShell; no se muestra error en la vista.
      if (esSesionFinalizada(e)) return;
      setDesactualizada(true);
      setError(e instanceof Error ? e : new Error('No se pudo cargar la emergencia'));
    }
  }, [eid, sujetoId, token]);

  useEffect(() => {
    if (!eid) return;
    let vigente = true;
    // Un caso distinto no se compara con el anterior: no hay anuncio en la primera lectura.
    detalleRef.current = null;
    // La carga inicial sincroniza una fuente externa (BFF) con el estado local.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true);
    void cargar().finally(() => {
      if (vigente) setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, [cargar, eid]);

  useEffect(() => {
    if (!eid || !token) return;
    const polling = crearPollingEmergencias(cargar);
    polling.iniciar();
    return () => polling.detener();
  }, [cargar, eid, token]);

  const cargarMasNotas = useCallback(async () => {
    if (!eid || !cursorNotas || cargandoMasNotas) return;
    setCargandoMasNotas(true);
    try {
      const pagina = await listarNotasEmergencia(eid, token, cursorNotas);
      setNotas((previas) => [...previas, ...pagina.items]);
      setCursorNotas(pagina.cursor_siguiente);
    } catch (e) {
      if (esSesionFinalizada(e)) return;
      setError(e instanceof Error ? e : new Error('No se pudieron cargar más notas'));
    } finally {
      setCargandoMasNotas(false);
    }
  }, [cargandoMasNotas, cursorNotas, eid, token]);

  return {
    detalle,
    notas,
    hayMasNotas: cursorNotas !== null,
    cargando,
    cargandoMasNotas,
    error,
    actualizadoEn,
    desactualizada,
    anuncio,
    recargar: cargar,
    cargarMasNotas,
  };
}
