/*
 * Datos de solicitudes (M14): un `useQuery` por lectura y una mutación por acción del `bff`.
 *
 * Sin reintento automático. La interfaz muestra solo lo que devuelve el `bff` (sin actualización
 * optimista): tras una acción se vuelve a leer la bandeja y la solicitud.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/context/SessionContext';
import {
  aprobarSolicitud,
  confirmarPago,
  cotizarSolicitud,
  listarHistoricoSolicitud,
  listarSolicitudes,
  obtenerSolicitud,
  rechazarSolicitud,
  reprogramarSolicitud,
  revertirPago,
} from '@/lib/api/solicitudes';
import type {
  CotizacionEntrada,
  EstadoSolicitud,
  PagoEntrada,
  ReprogramacionEntrada,
  Solicitud,
} from '@/lib/contracts/solicitudes';

const CLAVE = 'solicitudes';

function useToken(): string {
  return useSession().sesion?.accessToken ?? '';
}

/**
 * Bandeja paginada por cursor. `estadoFijo` es el estado que el rol siempre pide (Jefe Operativo:
 * `PAGADO`); sin él, el usuario filtra con `estado`. Cambiar el filtro vuelve a la primera página.
 */
export function useBandejaSolicitudes(estadoFijo: EstadoSolicitud | undefined) {
  const token = useToken();
  const [filtro, setFiltro] = useState<EstadoSolicitud | undefined>(undefined);
  // Cursor de cada página visitada después de la primera; la página actual es la última.
  const [cursores, setCursores] = useState<readonly string[]>([]);
  const estado = estadoFijo ?? filtro;
  const cursor = cursores.at(-1);

  const consulta = useQuery({
    queryKey: [CLAVE, 'lista', { estado, cursor }],
    queryFn: () => listarSolicitudes({ estado, cursor }, token),
    retry: false,
  });
  const cursorSiguiente = consulta.data?.cursor_siguiente ?? null;

  return {
    consulta,
    filas: consulta.data?.items ?? [],
    estado,
    pagina: cursores.length + 1,
    cursorSiguiente,
    cambiarFiltro: (nuevo: EstadoSolicitud | undefined) => {
      setFiltro(nuevo);
      setCursores([]);
    },
    irAPagina: (pagina: number) => {
      if (pagina > cursores.length + 1 && cursorSiguiente) {
        setCursores([...cursores, cursorSiguiente]);
      } else if (pagina < cursores.length + 1 && pagina >= 1) {
        setCursores(cursores.slice(0, pagina - 1));
      }
    },
  };
}

export function useSolicitud(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: [CLAVE, 'detalle', id],
    queryFn: () => obtenerSolicitud(id, token),
    retry: false,
  });
}

export function useHistoricoSolicitud(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: [CLAVE, 'historico', id],
    queryFn: () => listarHistoricoSolicitud(id, token),
    retry: false,
  });
}

/**
 * Acciones sobre una solicitud. Todas responden la `Solicitud` ya actualizada: se guarda como el
 * detalle vigente (sin volver a pedirla: el Jefe Operativo recibiría `404` al salir de `PAGADO`,
 * Requirement 15.4) y se vuelven a leer la bandeja y el histórico.
 */
export function useAccionesSolicitud(id: string) {
  const token = useToken();
  const cliente = useQueryClient();
  const alTerminar = async (solicitud: Solicitud) => {
    cliente.setQueryData([CLAVE, 'detalle', id], solicitud);
    await Promise.all([
      cliente.invalidateQueries({ queryKey: [CLAVE, 'lista'] }),
      cliente.invalidateQueries({ queryKey: [CLAVE, 'historico', id] }),
    ]);
  };

  const cotizar = useMutation({
    mutationFn: (entrada: CotizacionEntrada) => cotizarSolicitud(id, entrada, token),
    onSuccess: alTerminar,
  });
  const reprogramar = useMutation({
    mutationFn: (entrada: ReprogramacionEntrada) => reprogramarSolicitud(id, entrada, token),
    onSuccess: alTerminar,
  });
  const confirmar = useMutation({
    mutationFn: (entrada: PagoEntrada) => confirmarPago(id, entrada, token),
    onSuccess: alTerminar,
  });
  const revertir = useMutation({
    mutationFn: (motivo: string) => revertirPago(id, motivo, token),
    onSuccess: alTerminar,
  });
  const aprobar = useMutation({
    mutationFn: () => aprobarSolicitud(id, token),
    onSuccess: alTerminar,
  });
  const rechazar = useMutation({
    mutationFn: (motivo: string) => rechazarSolicitud(id, motivo, token),
    onSuccess: alTerminar,
  });

  return { cotizar, reprogramar, confirmar, revertir, aprobar, rechazar };
}
