/*
 * Mocks de solicitudes (M14, tracer.46): bandeja, detalle, histórico, cotización, reprogramación,
 * pago, aprobación y rechazo. Emulan la frontera del `bff` (Requirement T3): rol por capacidad,
 * estado de origen, vigencia del pago y los `codigo` de máquina del contrato. No son la
 * autoridad. El estado vive en memoria; `reiniciarSolicitudesMock()` lo devuelve a la semilla.
 *
 * La bandeja de conversaciones de solicitud responde vacía.
 * El Jefe Operativo solo ve `PAGADO`, sin `cotizacion` ni `pago` (DEC-148 #22 y #67); una
 * solicitud fuera de `PAGADO` le responde `404`. Aprobar no crea el viaje en el almacén simulado.
 */
import { http, HttpResponse } from 'msw';
import { API_PREFIX } from '@/lib/constants';
import { Rol } from '@/lib/contracts';
import type {
  Cotizacion,
  EstadoSolicitud,
  HistoricoSolicitudItem,
  Pago,
  Solicitud,
} from '@/lib/contracts/solicitudes';
import { puede } from '@/lib/permisos';
import { autorizarMock, rolDeSolicitud } from './autorizacion';
import { CLIENTES_DEMO } from './data';

const path = (segmento: string) => `${API_PREFIX}${segmento}`;

interface SolicitudMock extends Omit<Solicitud, 'cotizacion' | 'pago' | 'cliente'> {
  cotizacion: Cotizacion | null;
  pago: Pago | null;
  historico: HistoricoSolicitudItem[];
}

const VIGENCIA_DIAS = 15;
const DIA_MS = 24 * 60 * 60 * 1000;

function dia(desde: Date, dias = 0): string {
  return new Date(desde.getTime() + dias * DIA_MS).toISOString().slice(0, 10);
}

function cotizacionDe(version: number, entregada: Date, fecha: string): Cotizacion {
  return {
    version,
    monto: '18500.00',
    moneda: 'MXN',
    fecha_hora_servicio: fecha,
    notas: null,
    entregada_en: entregada.toISOString(),
    vigente_hasta: dia(entregada, VIGENCIA_DIAS),
  };
}

function semilla(): SolicitudMock[] {
  const ahora = new Date();
  const hace = (dias: number) => new Date(ahora.getTime() - dias * DIA_MS);
  const futuro = (dias: number) => new Date(ahora.getTime() + dias * DIA_MS).toISOString();
  const base = {
    marca_penalizacion: false,
    motivo_rechazo: null,
    tipo_servicio: 'custodia',
    tracto: null,
    avisos: [] as string[],
  };
  const cotizada = (dias: number, fecha: string) => cotizacionDe(1, hace(dias), fecha);
  return [
    {
      ...base,
      id: 'SOL-1001',
      estado: 'SOLICITADO',
      cliente_id: 'CLI-1001',
      origen: 'Manzanillo',
      destinos: [{ nombre: 'Guadalajara' }],
      fecha_hora_servicio: futuro(10),
      cotizacion: null,
      pago: null,
      avisos: ['nueva'],
      creado_en: hace(1).toISOString(),
      historico: [{ accion: 'creada', actor_id: 'CLI-1001', en: hace(1).toISOString() }],
    },
    {
      ...base,
      id: 'SOL-1002',
      estado: 'COTIZADO',
      cliente_id: 'CLI-1002',
      origen: 'Veracruz',
      destinos: [{ nombre: 'Puebla' }, { nombre: 'Ciudad de México' }],
      fecha_hora_servicio: futuro(8),
      cotizacion: cotizada(3, futuro(8)),
      pago: null,
      creado_en: hace(4).toISOString(),
      historico: [
        { accion: 'creada', actor_id: 'CLI-1002', en: hace(4).toISOString() },
        {
          accion: 'cotizada',
          de_estado: 'SOLICITADO',
          a_estado: 'COTIZADO',
          actor_id: 'COT-1',
          cotizacion: cotizada(3, futuro(8)),
          en: hace(3).toISOString(),
        },
      ],
    },
    {
      ...base,
      id: 'SOL-1003',
      estado: 'PAGADO',
      cliente_id: 'CLI-1001',
      origen: 'Lázaro Cárdenas',
      destinos: [{ nombre: 'Querétaro' }],
      fecha_hora_servicio: futuro(6),
      cotizacion: cotizada(5, futuro(6)),
      pago: {
        fecha_pago: dia(hace(2)),
        referencia: 'SPEI-20481',
        confirmado_en: hace(2).toISOString(),
      },
      creado_en: hace(7).toISOString(),
      historico: [
        { accion: 'creada', actor_id: 'CLI-1001', en: hace(7).toISOString() },
        {
          accion: 'cotizada',
          de_estado: 'SOLICITADO',
          a_estado: 'COTIZADO',
          actor_id: 'COT-1',
          cotizacion: cotizada(5, futuro(6)),
          en: hace(5).toISOString(),
        },
        {
          accion: 'pago_confirmado',
          de_estado: 'COTIZADO',
          a_estado: 'PAGADO',
          actor_id: 'COT-1',
          en: hace(2).toISOString(),
        },
      ],
    },
    {
      ...base,
      id: 'SOL-1004',
      estado: 'PAGADO',
      cliente_id: 'CLI-1003',
      origen: 'Altamira',
      destinos: [{ nombre: 'Monterrey' }],
      fecha_hora_servicio: null,
      cotizacion: cotizada(4, futuro(9)),
      pago: { fecha_pago: dia(hace(1)), referencia: null, confirmado_en: hace(1).toISOString() },
      creado_en: hace(6).toISOString(),
      historico: [
        { accion: 'creada', actor_id: 'CLI-1003', en: hace(6).toISOString() },
        {
          accion: 'pago_confirmado',
          de_estado: 'COTIZADO',
          a_estado: 'PAGADO',
          actor_id: 'COT-1',
          en: hace(1).toISOString(),
        },
      ],
    },
    {
      ...base,
      id: 'SOL-1005',
      estado: 'RECHAZADO_POR_CLIENTE',
      cliente_id: 'CLI-1002',
      origen: 'Tampico',
      destinos: [{ nombre: 'San Luis Potosí' }],
      fecha_hora_servicio: futuro(12),
      cotizacion: cotizada(9, futuro(12)),
      pago: null,
      creado_en: hace(10).toISOString(),
      historico: [
        { accion: 'creada', actor_id: 'CLI-1002', en: hace(10).toISOString() },
        {
          accion: 'cotizacion_rechazada',
          de_estado: 'COTIZADO',
          a_estado: 'RECHAZADO_POR_CLIENTE',
          actor_id: 'CLI-1002',
          en: hace(8).toISOString(),
        },
      ],
    },
  ];
}

let solicitudes = semilla();

/** Devuelve las solicitudes simuladas a la semilla. Lo usan las pruebas. */
export function reiniciarSolicitudesMock(): void {
  solicitudes = semilla();
}

/* -------------------------------------------------------------------------- */

function error(status: number, codigo: string, mensaje: string) {
  return HttpResponse.json({ codigo, mensaje }, { status });
}

/** Wire de la solicitud. Quien no ve datos comerciales no recibe `cotizacion` ni `pago`. */
function wire(solicitud: SolicitudMock, rol: Rol | null): Solicitud {
  const { cotizacion, pago } = solicitud;
  const resto: Partial<SolicitudMock> = { ...solicitud };
  delete resto.historico;
  delete resto.cotizacion;
  delete resto.pago;
  const cliente = CLIENTES_DEMO.find((c) => c.id === solicitud.cliente_id);
  const comercial = puede(rol, 'solicitud.verComercial');
  return {
    ...resto,
    ...(cliente ? { cliente: { id: cliente.id, nombre: cliente.nombre } } : {}),
    ...(comercial ? { cotizacion, pago } : {}),
  } as Solicitud;
}

/** El Jefe Operativo solo alcanza solicitudes `PAGADO`; el resto es `404` (DEC-148 #22). */
function visible(solicitud: SolicitudMock, rol: Rol | null): boolean {
  return puede(rol, 'solicitud.verComercial') || solicitud.estado === 'PAGADO';
}

function buscar(id: unknown, rol: Rol | null): SolicitudMock | null {
  const solicitud = solicitudes.find((s) => s.id === id);
  return solicitud && visible(solicitud, rol) ? solicitud : null;
}

function noEncontrada() {
  return error(404, 'no_encontrado', 'solicitud');
}

function transicionNoPermitida() {
  return error(409, 'transicion_no_permitida', 'el estado de origen no permite esta acción');
}

function registrar(
  solicitud: SolicitudMock,
  accion: string,
  cambio: Partial<HistoricoSolicitudItem> = {},
): void {
  solicitud.historico.push({ accion, actor_id: 'mock', en: new Date().toISOString(), ...cambio });
}

function cambiarEstado(solicitud: SolicitudMock, a: EstadoSolicitud): EstadoSolicitud {
  const de = solicitud.estado;
  solicitud.estado = a;
  return de;
}

async function leerJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const cuerpo: unknown = await request.json();
    return cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const textoNoVacio = (valor: unknown): valor is string =>
  typeof valor === 'string' && valor.trim().length > 0;

const fechaValida = (valor: unknown): valor is string =>
  typeof valor === 'string' && !Number.isNaN(new Date(valor).getTime());

export const handlersSolicitudes = [
  // Pool de conversaciones de solicitud (cotizacion y administrador). Vacío: el almacén de
  // conversaciones simuladas es del viaje; leer, reclamar y responder sigue el mismo mecanismo.
  http.get(path('/bandeja/solicitudes'), ({ request }) => {
    const denegado = autorizarMock(request, 'solicitud.conversacion');
    if (denegado) return denegado;
    return HttpResponse.json({ items: [], revision: 0, cursor_siguiente: null });
  }),

  http.get(path('/solicitudes'), ({ request }) => {
    const denegado = autorizarMock(request, 'solicitud.listar');
    if (denegado) return denegado;
    const rol = rolDeSolicitud(request);
    const estado = new URL(request.url).searchParams.get('estado');
    const items = solicitudes
      .filter((s) => visible(s, rol))
      .filter((s) => estado === null || s.estado === estado)
      .map((s) => wire(s, rol));
    return HttpResponse.json({ items, cursor_siguiente: null });
  }),

  http.get(path('/solicitudes/:id'), ({ params, request }) => {
    const denegado = autorizarMock(request, 'solicitud.ver');
    if (denegado) return denegado;
    const rol = rolDeSolicitud(request);
    const solicitud = buscar(params.id, rol);
    return solicitud ? HttpResponse.json(wire(solicitud, rol)) : noEncontrada();
  }),

  http.get(path('/solicitudes/:id/historico'), ({ params, request }) => {
    const denegado = autorizarMock(request, 'solicitud.ver');
    if (denegado) return denegado;
    const rol = rolDeSolicitud(request);
    const solicitud = buscar(params.id, rol);
    if (!solicitud) return noEncontrada();
    const comercial = puede(rol, 'solicitud.verComercial');
    const items = solicitud.historico.map(({ cotizacion: _cotizacion, ...resto }) =>
      comercial ? { ...resto, cotizacion: _cotizacion } : resto,
    );
    return HttpResponse.json({ items });
  }),

  // Cotizar o recotizar: SOLICITADO o COTIZADO; la vigencia corre desde la última entrega.
  http.put(path('/solicitudes/:id/cotizacion'), async ({ params, request }) => {
    const denegado = autorizarMock(request, 'solicitud.cotizar');
    if (denegado) return denegado;
    const rol = rolDeSolicitud(request);
    const solicitud = buscar(params.id, rol);
    if (!solicitud) return noEncontrada();
    const cuerpo = await leerJson(request);
    if (
      !cuerpo ||
      typeof cuerpo.monto !== 'string' ||
      !/^\d+(\.\d+)?$/.test(cuerpo.monto) ||
      !textoNoVacio(cuerpo.moneda) ||
      !fechaValida(cuerpo.fecha_hora_servicio)
    ) {
      return error(400, 'validacion', 'monto, moneda y fecha_hora_servicio son obligatorios');
    }
    if (solicitud.estado !== 'SOLICITADO' && solicitud.estado !== 'COTIZADO') {
      return transicionNoPermitida();
    }
    const nueva = cotizacionDe(
      (solicitud.cotizacion?.version ?? 0) + 1,
      new Date(),
      cuerpo.fecha_hora_servicio,
    );
    nueva.monto = cuerpo.monto;
    nueva.moneda = cuerpo.moneda;
    nueva.notas = typeof cuerpo.notas === 'string' ? cuerpo.notas : null;
    const recotiza = solicitud.estado === 'COTIZADO';
    const de = cambiarEstado(solicitud, 'COTIZADO');
    solicitud.cotizacion = nueva;
    solicitud.fecha_hora_servicio = cuerpo.fecha_hora_servicio;
    solicitud.avisos = [];
    registrar(solicitud, recotiza ? 'recotizada' : 'cotizada', {
      de_estado: recotiza ? null : de,
      a_estado: recotiza ? null : 'COTIZADO',
      cotizacion: nueva,
    });
    return HttpResponse.json(wire(solicitud, rol));
  }),

  // Reprogramar: solo en PAGADO, con motivo; no cambia de estado.
  http.put(path('/solicitudes/:id/fecha-hora'), async ({ params, request }) => {
    const denegado = autorizarMock(request, 'solicitud.reprogramar');
    if (denegado) return denegado;
    const rol = rolDeSolicitud(request);
    const solicitud = buscar(params.id, rol);
    if (!solicitud) return noEncontrada();
    const cuerpo = await leerJson(request);
    if (!cuerpo || !fechaValida(cuerpo.fecha_hora_servicio) || !textoNoVacio(cuerpo.motivo)) {
      return error(400, 'validacion', 'fecha_hora_servicio y motivo son obligatorios');
    }
    if (solicitud.estado !== 'PAGADO') return transicionNoPermitida();
    solicitud.fecha_hora_servicio = cuerpo.fecha_hora_servicio;
    registrar(solicitud, 'reprogramada', { motivo: cuerpo.motivo.trim() });
    return HttpResponse.json(wire(solicitud, rol));
  }),

  // Confirmar pago: COTIZADO → PAGADO; la fecha cae dentro de la vigencia de la última cotización.
  http.put(path('/solicitudes/:id/pago'), async ({ params, request }) => {
    const denegado = autorizarMock(request, 'solicitud.confirmarPago');
    if (denegado) return denegado;
    const rol = rolDeSolicitud(request);
    const solicitud = buscar(params.id, rol);
    if (!solicitud) return noEncontrada();
    const cuerpo = await leerJson(request);
    if (
      !cuerpo ||
      typeof cuerpo.fecha_pago !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(cuerpo.fecha_pago)
    ) {
      return error(400, 'validacion', 'fecha_pago es obligatoria (YYYY-MM-DD)');
    }
    if (solicitud.estado !== 'COTIZADO' || !solicitud.cotizacion) return transicionNoPermitida();
    const entrega = solicitud.cotizacion.entregada_en.slice(0, 10);
    if (cuerpo.fecha_pago < entrega || cuerpo.fecha_pago > solicitud.cotizacion.vigente_hasta) {
      return error(
        409,
        'fecha_pago_fuera_de_vigencia',
        'la fecha del pago está fuera de la vigencia',
      );
    }
    const de = cambiarEstado(solicitud, 'PAGADO');
    solicitud.pago = {
      fecha_pago: cuerpo.fecha_pago,
      referencia: typeof cuerpo.referencia === 'string' ? cuerpo.referencia : null,
      confirmado_en: new Date().toISOString(),
    };
    solicitud.avisos = [];
    registrar(solicitud, 'pago_confirmado', { de_estado: de, a_estado: 'PAGADO' });
    return HttpResponse.json(wire(solicitud, rol));
  }),

  // Revertir pago: PAGADO → COTIZADO, con motivo. Solo el administrador (DEC-148 #37).
  http.post(path('/solicitudes/:id/reversa-pago'), async ({ params, request }) => {
    const denegado = autorizarMock(request, 'solicitud.revertirPago');
    if (denegado) return denegado;
    const rol = rolDeSolicitud(request);
    const solicitud = buscar(params.id, rol);
    if (!solicitud) return noEncontrada();
    const cuerpo = await leerJson(request);
    if (!cuerpo || !textoNoVacio(cuerpo.motivo)) {
      return error(400, 'validacion', 'el motivo es obligatorio');
    }
    if (solicitud.estado !== 'PAGADO') return transicionNoPermitida();
    const de = cambiarEstado(solicitud, 'COTIZADO');
    solicitud.pago = null;
    registrar(solicitud, 'pago_revertido', {
      de_estado: de,
      a_estado: 'COTIZADO',
      motivo: cuerpo.motivo.trim(),
    });
    return HttpResponse.json(wire(solicitud, rol));
  }),

  // Aprobar: PAGADO → APROBADO; exige la fecha y hora del servicio.
  http.post(path('/solicitudes/:id/aprobacion'), ({ params, request }) => {
    const denegado = autorizarMock(request, 'solicitud.aprobar');
    if (denegado) return denegado;
    const rol = rolDeSolicitud(request);
    const solicitud = buscar(params.id, rol);
    if (!solicitud) return noEncontrada();
    if (solicitud.estado !== 'PAGADO') return transicionNoPermitida();
    if (!solicitud.fecha_hora_servicio) {
      return error(409, 'fecha_hora_servicio_requerida', 'falta la fecha y hora del servicio');
    }
    const de = cambiarEstado(solicitud, 'APROBADO');
    registrar(solicitud, 'aprobada', { de_estado: de, a_estado: 'APROBADO' });
    return HttpResponse.json(wire(solicitud, rol));
  }),

  // Rechazar: PAGADO → RECHAZADO_POR_AI27, con motivo; no crea viaje.
  http.post(path('/solicitudes/:id/rechazo'), async ({ params, request }) => {
    const denegado = autorizarMock(request, 'solicitud.rechazar');
    if (denegado) return denegado;
    const rol = rolDeSolicitud(request);
    const solicitud = buscar(params.id, rol);
    if (!solicitud) return noEncontrada();
    const cuerpo = await leerJson(request);
    if (!cuerpo || !textoNoVacio(cuerpo.motivo)) {
      return error(400, 'validacion', 'el motivo es obligatorio');
    }
    if (solicitud.estado !== 'PAGADO') return transicionNoPermitida();
    const de = cambiarEstado(solicitud, 'RECHAZADO_POR_AI27');
    solicitud.motivo_rechazo = cuerpo.motivo.trim();
    registrar(solicitud, 'rechazada', {
      de_estado: de,
      a_estado: 'RECHAZADO_POR_AI27',
      motivo: cuerpo.motivo.trim(),
    });
    return HttpResponse.json(wire(solicitud, rol));
  }),
];
