import type {
  DescargaAdjunto,
  IntencionSubidaAdjunto,
  IntencionSubidaAdjuntoEntrada,
  PaginaAdjuntos,
} from '../contracts/adjuntos';
import { request } from './client';
import { ApiError } from './errors';
import { ErrorViajeInexistente } from './expediente';

/** Error cuando la autorización no alcanza al viaje o a sus adjuntos. */
export class ErrorAdjuntosProhibido extends ApiError {
  constructor() {
    super('noAutorizado', 'No tienes autorización para la evidencia de este viaje.', 403);
    this.name = 'ErrorAdjuntosProhibido';
  }
}

/**
 * Rechazo de la intención de subida (`400`). El contrato no define códigos de máquina
 * para formato, tamaño ni cantidad, así que el mensaje es genérico.
 */
export class ErrorSubidaRechazada extends Error {
  readonly status = 400;

  constructor() {
    super('La subida fue rechazada.');
    this.name = 'ErrorSubidaRechazada';
  }
}

/** Fallo de la transferencia de bytes al almacenamiento de objetos (red o respuesta no exitosa). */
export class ErrorSubidaFallida extends Error {
  constructor() {
    super('No se pudo transferir el archivo al almacenamiento.');
    this.name = 'ErrorSubidaFallida';
  }
}

function clasificarErrorAdjuntos(error: unknown): never {
  if (!(error instanceof ApiError)) throw error;

  if (error.status === 403) throw new ErrorAdjuntosProhibido();
  if (error.status === 404) throw new ErrorViajeInexistente();

  throw error;
}

/** Lista la evidencia del viaje. No devuelve bytes. */
export async function listarAdjuntos(id: string, accessToken: string): Promise<PaginaAdjuntos> {
  try {
    return await request<PaginaAdjuntos>(`/viajes/${id}/adjuntos`, { accessToken });
  } catch (error) {
    clasificarErrorAdjuntos(error);
  }
}

/**
 * Pide una intención de subida. El `bff` la reenvía a `operacion`, que deja el adjunto
 * en `pendiente`. Un `400` se convierte en `ErrorSubidaRechazada`.
 */
export async function crearIntencionSubidaAdjunto(
  id: string,
  entrada: IntencionSubidaAdjuntoEntrada,
  accessToken: string,
): Promise<IntencionSubidaAdjunto> {
  try {
    return await request<IntencionSubidaAdjunto>(`/viajes/${id}/adjuntos/intenciones-subida`, {
      method: 'POST',
      body: entrada,
      accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) throw new ErrorSubidaRechazada();
    clasificarErrorAdjuntos(error);
  }
}

/** Pide una URL de descarga de vida corta. Cada descarga la audita `operacion`. */
export async function descargarAdjunto(
  id: string,
  adjuntoId: string,
  accessToken: string,
): Promise<DescargaAdjunto> {
  try {
    return await request<DescargaAdjunto>(`/viajes/${id}/adjuntos/${adjuntoId}/descarga`, {
      accessToken,
    });
  } catch (error) {
    clasificarErrorAdjuntos(error);
  }
}

/**
 * Transfiere los bytes al almacenamiento con `PUT`, usando la URL de la intención.
 * Es la única excepción a «el frontend solo habla con el bff»: no lleva `Authorization`.
 * No fija `Content-Type`: el navegador toma el `type` del `File`, que es el `tipo_medio`
 * declarado. El contrato no documenta otras cabeceras del `PUT` firmado.
 */
export async function subirBytes(url: string, archivo: File): Promise<void> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, { method: 'PUT', body: archivo });
  } catch {
    throw new ErrorSubidaFallida();
  }
  if (!respuesta.ok) throw new ErrorSubidaFallida();
}
