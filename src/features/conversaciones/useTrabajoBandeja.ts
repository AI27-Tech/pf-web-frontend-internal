import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { listarTrabajoBandeja } from '@/lib/api/conversaciones';
import { ApiError } from '@/lib/api/errors';
import type { Conversacion } from '@/lib/contracts/conversaciones';
import { aplicarConversaciones } from './aplicarCambios';
import { crearPolling } from './actualizacion';

export function useTrabajoBandeja() {
  const { sesion } = useSession();
  const token = sesion?.accessToken ?? '';
  const [items, setItems] = useState<Conversacion[]>([]);
  const [revision, setRevision] = useState<number | undefined>();
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);
  const [desactualizada, setDesactualizada] = useState(false);

  const bootstrap = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await listarTrabajoBandeja(token);
      setItems(data.items);
      setRevision(data.revision);
      setCursor(data.cursor_siguiente);
      setActualizadoEn(new Date());
      setDesactualizada(false);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('No se pudo cargar la bandeja'));
    } finally {
      setCargando(false);
    }
  }, [token]);

  // La carga inicial sincroniza una fuente externa (BFF) con el estado local.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!token || revision === undefined) return;
    const polling = crearPolling(async () => {
      try {
        const data = await listarTrabajoBandeja(token, revision);
        setItems((old) => aplicarConversaciones(old, data.items));
        setRevision(data.revision);
        setCursor(data.cursor_siguiente);
        setActualizadoEn(new Date());
        setDesactualizada(false);
        setError(null);
      } catch (e) {
        if (e instanceof ApiError && e.codigo === 'stream_resync_required') void bootstrap();
        else {
          setDesactualizada(true);
          setError(e instanceof Error ? e : new Error('No se pudo actualizar la bandeja'));
        }
      }
    });
    polling.iniciar();
    return () => polling.detener();
  }, [bootstrap, token, revision]);

  const cargarMas = useCallback(async () => {
    if (!cursor || cargandoMas) return;
    setCargandoMas(true);
    try {
      const data = await listarTrabajoBandeja(token, undefined, cursor);
      setItems((old) => aplicarConversaciones(old, data.items));
      setRevision(data.revision);
      setCursor(data.cursor_siguiente);
      setActualizadoEn(new Date());
      setDesactualizada(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('No se pudo cargar más conversaciones'));
    } finally {
      setCargandoMas(false);
    }
  }, [cargandoMas, cursor, token]);

  return {
    items,
    revision,
    cursor,
    cargando,
    cargandoMas,
    error,
    actualizadoEn,
    desactualizada,
    reintentar: bootstrap,
    cargarMas,
  };
}
