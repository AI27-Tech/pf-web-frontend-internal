import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import {
  crearIntencionSubidaAdjunto,
  descargarAdjunto,
  listarAdjuntos,
  subirBytes,
} from '@/lib/api/adjuntos';
import type { Adjunto } from '@/lib/contracts/adjuntos';

import { esDescargable } from './adjuntoDescargable';
import { calcularSha256 } from './calcularSha256';
import { hayEscaneoPendiente, INTERVALO_SONDEO_ESCANEO_MS } from './sondeoEscaneo';
import { urlVigente } from './vigenciaUrl';

export interface EvidenciaViajeHook {
  readonly adjuntos: readonly Adjunto[];
  readonly cargando: boolean;
  readonly vacio: boolean;
  readonly error: Error | null;
  readonly reintentar: () => void;
  readonly subir: (archivo: File) => void;
  readonly subiendo: boolean;
  readonly errorSubida: Error | null;
  readonly descargar: (adjunto: Adjunto) => void;
  readonly descargando: boolean;
  readonly errorDescarga: Error | null;
}

const evidenciaKey = (id: string) => ['viaje', id, 'evidencia'] as const;

/** Abre una URL de vida corta con un ancla temporal, sin guardarla en ningún caché. */
function abrirUrl(url: string): void {
  const ancla = document.createElement('a');
  ancla.href = url;
  ancla.target = '_blank';
  ancla.rel = 'noopener noreferrer';
  document.body.appendChild(ancla);
  try {
    ancla.click();
  } finally {
    ancla.remove();
  }
}

/**
 * Evidencia del viaje: lista con sondeo, subida en tres pasos y descarga autorizada.
 * Las URL de vida corta no se guardan en caché, estado ni almacenamiento del navegador.
 */
export function useEvidenciaViaje(id: string): EvidenciaViajeHook {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  const queryClient = useQueryClient();

  const lista = useQuery({
    queryKey: evidenciaKey(id),
    queryFn: () => listarAdjuntos(id, accessToken),
    retry: false,
    refetchInterval: (query) =>
      hayEscaneoPendiente(query.state.data?.items ?? []) ? INTERVALO_SONDEO_ESCANEO_MS : false,
  });

  const subida = useMutation({
    mutationFn: async (archivo: File): Promise<void> => {
      const checksum = await calcularSha256(archivo);
      const intencion = await crearIntencionSubidaAdjunto(
        id,
        {
          nombre: archivo.name,
          tipo_medio: archivo.type,
          tamano_bytes: archivo.size,
          checksum_sha256: checksum,
        },
        accessToken,
      );
      if (!urlVigente(intencion.expira_en, Date.now())) {
        throw new Error('La URL de subida ya expiró. Vuelve a intentarlo.');
      }
      await subirBytes(intencion.url_subida, archivo);
    },
    retry: false,
    // Se invalida también ante error: el paso 1 pudo haber creado un adjunto `pendiente`.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: evidenciaKey(id) });
    },
  });

  const descarga = useMutation({
    mutationFn: async (adjunto: Adjunto): Promise<void> => {
      const autorizacion = await descargarAdjunto(id, adjunto.id, accessToken);
      if (!urlVigente(autorizacion.expira_en, Date.now())) {
        throw new Error('La URL de descarga ya expiró. Vuelve a intentarlo.');
      }
      abrirUrl(autorizacion.url_descarga);
    },
    retry: false,
    gcTime: 0,
  });

  const { mutate: subirArchivo } = subida;
  const { mutate: descargarAdjuntoMut } = descarga;

  return {
    adjuntos: lista.data?.items ?? [],
    cargando: lista.isPending,
    vacio: lista.isSuccess && lista.data.items.length === 0,
    error: lista.error ?? null,
    reintentar: () => void lista.refetch(),
    subir: (archivo) => subirArchivo(archivo),
    subiendo: subida.isPending,
    errorSubida: subida.error ?? null,
    descargar: (adjunto) => {
      // Un adjunto no `limpio` no autoriza descarga (contrato, Requirement 5.8).
      if (!esDescargable(adjunto.estado_escaneo)) return;
      descargarAdjuntoMut(adjunto);
    },
    descargando: descarga.isPending,
    errorDescarga: descarga.error ?? null,
  };
}
