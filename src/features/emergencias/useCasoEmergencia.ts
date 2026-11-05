import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { listarNotasEmergencia, obtenerEmergencia } from '@/lib/api/emergencias';
import type { DetalleEmergenciaReaccion, NotaEmergencia } from '@/lib/contracts/emergencias';
import { crearPollingEmergencias } from './actualizacion';

/**
 * Detalle y notas de un caso. Se actualiza por polling. Un fallo conserva lo ya mostrado
 * y marca la vista como desactualizada (Req 10.4).
 */
export function useCasoEmergencia(eid: string | undefined) {
  const { sesion } = useSession();
  const token = sesion?.accessToken ?? '';
  const [detalle, setDetalle] = useState<DetalleEmergenciaReaccion | null>(null);
  const [notas, setNotas] = useState<NotaEmergencia[]>([]);
  const [cursorNotas, setCursorNotas] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoMasNotas, setCargandoMasNotas] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);
  const [desactualizada, setDesactualizada] = useState(false);

  const cargar = useCallback(async () => {
    if (!eid) return;
    try {
      const [caso, pagina] = await Promise.all([
        obtenerEmergencia(eid, token),
        listarNotasEmergencia(eid, token),
      ]);
      setDetalle(caso);
      setNotas(pagina.items);
      setCursorNotas(pagina.cursor_siguiente);
      setActualizadoEn(new Date());
      setDesactualizada(false);
      setError(null);
    } catch (e) {
      setDesactualizada(true);
      setError(e instanceof Error ? e : new Error('No se pudo cargar la emergencia'));
    }
  }, [eid, token]);

  useEffect(() => {
    if (!eid) return;
    let vigente = true;
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
    recargar: cargar,
    cargarMasNotas,
  };
}
