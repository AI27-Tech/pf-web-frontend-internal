/*
 * Wrapper de dominio de solicitudes (M14, tracer.46). Superficie de audiencia interna.
 *
 * Una función por operación del `bff`. Las reglas (estado de origen, fecha de pago dentro de la
 * vigencia, rol) las aplica el servidor: aquí solo se propaga el `ApiError` con su `codigo`.
 * `features/` llama aquí, nunca a `client.ts`.
 */
import type {
  CotizacionEntrada,
  EstadoSolicitud,
  HistoricoSolicitud,
  PagoEntrada,
  PaginaSolicitudes,
  ReprogramacionEntrada,
  Solicitud,
} from '../contracts/solicitudes';
import { request } from './client';

export interface ParamsListarSolicitudes {
  readonly estado?: EstadoSolicitud | undefined;
  readonly cursor?: string | undefined;
}

function ruta(id: string, sufijo = ''): string {
  return `/solicitudes/${encodeURIComponent(id)}${sufijo}`;
}

export function listarSolicitudes(
  params: ParamsListarSolicitudes,
  accessToken: string,
): Promise<PaginaSolicitudes> {
  const query = new URLSearchParams();
  if (params.estado) query.set('estado', params.estado);
  if (params.cursor) query.set('cursor', params.cursor);
  const texto = query.toString();
  return request<PaginaSolicitudes>(`/solicitudes${texto ? `?${texto}` : ''}`, { accessToken });
}

export function obtenerSolicitud(id: string, accessToken: string): Promise<Solicitud> {
  return request<Solicitud>(ruta(id), { accessToken });
}

export function listarHistoricoSolicitud(
  id: string,
  accessToken: string,
): Promise<HistoricoSolicitud> {
  return request<HistoricoSolicitud>(ruta(id, '/historico'), { accessToken });
}

/** Cotiza una solicitud en `SOLICITADO` o recotiza una en `COTIZADO`. */
export function cotizarSolicitud(
  id: string,
  entrada: CotizacionEntrada,
  accessToken: string,
): Promise<Solicitud> {
  return request<Solicitud>(ruta(id, '/cotizacion'), { method: 'PUT', body: entrada, accessToken });
}

/** Cambia la fecha y hora de una solicitud en `PAGADO`; el motivo es obligatorio. */
export function reprogramarSolicitud(
  id: string,
  entrada: ReprogramacionEntrada,
  accessToken: string,
): Promise<Solicitud> {
  return request<Solicitud>(ruta(id, '/fecha-hora'), {
    method: 'PUT',
    body: entrada,
    accessToken,
  });
}

/** `COTIZADO` → `PAGADO`. La fecha del pago debe caer dentro de la vigencia. */
export function confirmarPago(
  id: string,
  entrada: PagoEntrada,
  accessToken: string,
): Promise<Solicitud> {
  return request<Solicitud>(ruta(id, '/pago'), { method: 'PUT', body: entrada, accessToken });
}

/** `PAGADO` → `COTIZADO`, con motivo. Solo el administrador (DEC-148 #37). */
export function revertirPago(id: string, motivo: string, accessToken: string): Promise<Solicitud> {
  return request<Solicitud>(ruta(id, '/reversa-pago'), {
    method: 'POST',
    body: { motivo },
    accessToken,
  });
}

/** `PAGADO` → `APROBADO`; el viaje nace con el mismo id. */
export function aprobarSolicitud(id: string, accessToken: string): Promise<Solicitud> {
  return request<Solicitud>(ruta(id, '/aprobacion'), { method: 'POST', accessToken });
}

/** `PAGADO` → `RECHAZADO_POR_AI27`, con motivo. No crea viaje. */
export function rechazarSolicitud(
  id: string,
  motivo: string,
  accessToken: string,
): Promise<Solicitud> {
  return request<Solicitud>(ruta(id, '/rechazo'), {
    method: 'POST',
    body: { motivo },
    accessToken,
  });
}
