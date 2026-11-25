/*
 * Qué acciones ofrece la UI sobre una solicitud (M14, Requirement 15).
 *
 * Una acción se ofrece si el rol tiene su capacidad y el estado de la solicitud es uno de origen
 * válido (E10-HU-035, 037 y E1-HU-003 v2). Es afordancia: el `bff` aplica la regla y responde
 * `403` o `409`.
 */
import { puede, type Capacidad } from '@/lib/permisos';
import type { EstadoSolicitud, Solicitud } from '@/lib/contracts/solicitudes';

export type AccionSolicitud =
  'cotizar' | 'reprogramar' | 'confirmarPago' | 'revertirPago' | 'aprobar' | 'rechazar';

interface ReglaAccion {
  readonly capacidad: Capacidad;
  readonly desde: readonly EstadoSolicitud[];
}

const REGLAS: Readonly<Record<AccionSolicitud, ReglaAccion>> = {
  cotizar: { capacidad: 'solicitud.cotizar', desde: ['SOLICITADO', 'COTIZADO'] },
  reprogramar: { capacidad: 'solicitud.reprogramar', desde: ['PAGADO'] },
  // `VENCIDA` admite un pago tardío, una sola vez (E10-HU-037, DEC-148 #35 y #64).
  confirmarPago: { capacidad: 'solicitud.confirmarPago', desde: ['COTIZADO', 'VENCIDA'] },
  revertirPago: { capacidad: 'solicitud.revertirPago', desde: ['PAGADO'] },
  aprobar: { capacidad: 'solicitud.aprobar', desde: ['PAGADO'] },
  rechazar: { capacidad: 'solicitud.rechazar', desde: ['PAGADO'] },
};

/** Acciones que `rol` puede ofrecer sobre una solicitud en ese estado, en orden fijo. */
export function accionesPermitidas(
  estado: EstadoSolicitud,
  rol: string | null | undefined,
): readonly AccionSolicitud[] {
  return (Object.keys(REGLAS) as AccionSolicitud[]).filter((accion) => {
    const regla = REGLAS[accion];
    return regla.desde.includes(estado) && puede(rol, regla.capacidad);
  });
}

/** El Jefe Operativo no ve cotización, pago ni notas comerciales (DEC-148 #67). */
export function veDatosComerciales(rol: string | null | undefined): boolean {
  return puede(rol, 'solicitud.verComercial');
}

/**
 * Estado que el rol pide a la bandeja. El Jefe Operativo solo trabaja `PAGADO` y no pide otro
 * (Requirement 15.1); quien ve todo no fija ninguno y puede filtrar.
 */
export function estadoFijoDeBandeja(rol: string | null | undefined): EstadoSolicitud | undefined {
  return veDatosComerciales(rol) ? undefined : 'PAGADO';
}

/** Aprobar exige la fecha y hora del servicio; sin ella se bloquea y se explica (15.3). */
export function aprobacionBloqueada(solicitud: Pick<Solicitud, 'fecha_hora_servicio'>): boolean {
  return !solicitud.fecha_hora_servicio;
}

export function etiquetaCotizar(estado: EstadoSolicitud): string {
  return estado === 'COTIZADO' ? 'Recotizar' : 'Cotizar';
}
