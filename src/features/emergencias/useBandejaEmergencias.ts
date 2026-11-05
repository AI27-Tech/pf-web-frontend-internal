import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { esSesionFinalizada, listarBandejaEmergencias } from '@/lib/api/emergencias';
import type { EmergenciaReaccion } from '@/lib/contracts/emergencias';
import { crearPollingEmergencias } from './actualizacion';

/**
 * Bandeja de Reacción: carga inicial, polling y paginación por cursor.
 *
 * La bandeja no trae `revision` de colección. Cada ciclo de polling vuelve a pedir
 * todas las páginas ya cargadas (por cursor), así que un caso que desaparece (p. ej.
 * cerrado) sale de la lista y las páginas siguientes se conservan. Un fallo de
 * polling deja lo mostrado y marca la vista como desactualizada (Req 10.4).
 */
export function useBandejaEmergencias() {
  const { sesion } = useSession();
  const token = sesion?.accessToken ?? '';
  const [items, setItems] = useState<EmergenciaReaccion[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);
  const [desactualizada, setDesactualizada] = useState(false);
  // Número de páginas cargadas. Un ciclo de polling las vuelve a pedir todas.
  const paginasCargadas = useRef(1);

  const recargarPaginas = useCallback(async () => {
    try {
      const primera = await listarBandejaEmergencias(token);
      let todas = primera.items;
      let siguiente = primera.cursor_siguiente;
      let paginas = 1;
      while (siguiente && paginas < paginasCargadas.current) {
        const pagina = await listarBandejaEmergencias(token, siguiente);
        todas = [...todas, ...pagina.items];
        siguiente = pagina.cursor_siguiente;
        paginas += 1;
      }
      paginasCargadas.current = Math.max(paginas, 1);
      setItems(todas);
      setCursor(siguiente);
      setActualizadoEn(new Date());
      setDesactualizada(false);
      setError(null);
    } catch (e) {
      if (esSesionFinalizada(e)) return;
      setDesactualizada(true);
      setError(e instanceof Error ? e : new Error('No se pudo cargar la bandeja'));
    }
  }, [token]);

  // La carga inicial sincroniza una fuente externa (BFF) con el estado local.
  useEffect(() => {
    let vigente = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recargarPaginas().finally(() => {
      if (vigente) setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, [recargarPaginas]);

  useEffect(() => {
    if (!token) return;
    const polling = crearPollingEmergencias(recargarPaginas);
    polling.iniciar();
    return () => polling.detener();
  }, [recargarPaginas, token]);

  const cargarMas = useCallback(async () => {
    if (!cursor || cargandoMas) return;
    setCargandoMas(true);
    try {
      const pagina = await listarBandejaEmergencias(token, cursor);
      setItems((previos) => [...previos, ...pagina.items]);
      setCursor(pagina.cursor_siguiente);
      paginasCargadas.current += 1;
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('No se pudieron cargar más casos'));
    } finally {
      setCargandoMas(false);
    }
  }, [cargandoMas, cursor, token]);

  return {
    items,
    cursor,
    cargando,
    cargandoMas,
    error,
    actualizadoEn,
    desactualizada,
    reintentar: recargarPaginas,
    cargarMas,
  };
}
