/*
 * Presentación de los estados, avisos y acciones del histórico de la solicitud (M14).
 *
 * `Record<EstadoSolicitud, …>` obliga a cubrir cada estado del contrato: si el `bff` agrega uno,
 * el typecheck falla aquí.
 */
import type { EstadoSolicitud } from '@/lib/contracts/solicitudes';

export const ETIQUETA_ESTADO: Record<EstadoSolicitud, string> = {
  SOLICITADO: 'Solicitado',
  COTIZADO: 'Cotizado',
  PAGADO: 'Pagado',
  APROBADO: 'Aprobado',
  RECHAZADO_POR_AI27: 'Rechazado por AI27',
  RECHAZADO_POR_CLIENTE: 'Rechazado por el cliente',
  CANCELADO_POR_CLIENTE: 'Cancelado por el cliente',
  VENCIDA: 'Vencida',
};

export type VarianteEstado = 'info' | 'warning' | 'primary' | 'secure' | 'alert' | 'neutral';

export const VARIANTE_ESTADO: Record<EstadoSolicitud, VarianteEstado> = {
  SOLICITADO: 'info',
  COTIZADO: 'warning',
  PAGADO: 'primary',
  APROBADO: 'secure',
  RECHAZADO_POR_AI27: 'alert',
  RECHAZADO_POR_CLIENTE: 'neutral',
  CANCELADO_POR_CLIENTE: 'neutral',
  VENCIDA: 'neutral',
};

const ETIQUETA_AVISO: Readonly<Record<string, string>> = {
  nueva: 'Nueva',
  cotizacion_nueva: 'Cotización nueva',
  por_vencer: 'Por vencer',
  cancelacion_con_penalizacion: 'Cancelada con penalización',
  rechazo_de_ai27: 'Rechazada por AI27',
};

/** El contrato deja `avisos` abierto (`string[]`): un valor desconocido se muestra tal cual. */
export function etiquetaAviso(aviso: string): string {
  return ETIQUETA_AVISO[aviso] ?? aviso;
}

const ETIQUETA_ACCION: Readonly<Record<string, string>> = {
  creada: 'Solicitud creada',
  cotizada: 'Cotización enviada',
  recotizada: 'Recotización enviada',
  reprogramada: 'Fecha y hora reprogramada',
  pago_confirmado: 'Pago confirmado',
  pago_confirmado_tardio: 'Pago confirmado fuera de vigencia',
  pago_revertido: 'Pago revertido',
  cotizacion_rechazada: 'Cotización rechazada por el cliente',
  cancelada: 'Solicitud cancelada',
  vencida: 'Cotización vencida',
  aprobada: 'Solicitud aprobada',
  rechazada: 'Solicitud rechazada por AI27',
};

/** El contrato deja `accion` abierto (`string`): una acción desconocida se muestra tal cual. */
export function etiquetaAccion(accion: string): string {
  return ETIQUETA_ACCION[accion] ?? accion;
}

/** "13 nov 2026, 14:30" en la zona del navegador; `—` si no hay valor. */
export function formatearFechaHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

/** "13 nov 2026" para una fecha de calendario `YYYY-MM-DD`, sin pasar por la zona horaria. */
export function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return '—';
  const [anio, mes, dia] = valor.split('-').map(Number);
  if (!anio || !mes || !dia) return valor;
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-MX', { dateStyle: 'medium' });
}

/** ISO 8601 → valor de `DateTimeInput` (`YYYY-MM-DDTHH:mm`, hora local). `''` si no hay valor. */
export function aValorDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

/** Valor de `DateTimeInput` (hora local) → ISO 8601 para el contrato. */
export function deValorDateTime(valor: string): string {
  return new Date(valor).toISOString();
}
