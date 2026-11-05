/*
 * Handlers MSW de emergencias (E8-T18). Siguen la forma de `bff` (tracer.37) y los
 * códigos de error del contrato. El estado vive en memoria y se reinicia al recargar.
 */
import { http, HttpResponse } from 'msw';
import { API_PREFIX } from '@/lib/constants';
import type {
  DetalleEmergenciaReaccion,
  EmergenciaReaccion,
  EmergenciaViaje,
  NotaEmergencia,
} from '@/lib/contracts/emergencias';

const path = (segmento: string) => `${API_PREFIX}${segmento}`;

/** Responsable de demostración de los casos ya reclamados (no es el usuario de sesión). */
const RESPONSABLE_OTRO = 'sujeto-reaccion-otro';

const VIAJE_DEMO = {
  cliente_nombre: 'Transportes del Norte',
  estado: 'EN_TRANSITO',
  origen: 'Monterrey, NL',
  destinos: [{ nombre: 'Saltillo, Coah.', fecha_cita: null, arribo: false }],
  fecha_hora_servicio: '2026-11-03T14:00:00Z',
  tipo_servicio: 'escolta',
  eta_estimado: null,
  escolta: [
    {
      tipo: 'patrulla',
      economico: 'P-104',
      placas: 'NL-4521',
      custodios: [{ nombre: 'Custodio A', telefono: '+52 81 5555 0101' }],
    },
    { tipo: 'moto', custodios: [{ nombre: 'Custodio B' }] },
  ],
};

let casos: EmergenciaReaccion[] = [
  {
    id: 'em-001',
    estado: 'abierta',
    origen: 'cliente',
    version_reclamo: 1,
    reclamo_activo: null,
    activada_en: '2026-11-04T08:10:00Z',
  },
  {
    id: 'em-002',
    estado: 'en_atencion',
    origen: 'operacion',
    version_reclamo: 3,
    reclamo_activo: {
      id: 'rc-002',
      conversacion_id: 'em-002',
      responsable_id: RESPONSABLE_OTRO,
      version: 3,
      abierto_en: '2026-11-04T07:50:00Z',
    },
    activada_en: '2026-11-04T07:45:00Z',
  },
  {
    id: 'em-003',
    estado: 'resuelta',
    origen: 'operacion',
    version_reclamo: 2,
    reclamo_activo: null,
    activada_en: '2026-11-03T22:00:00Z',
    resuelta_en: '2026-11-03T23:00:00Z',
  },
];

const notasPorCaso: Record<string, NotaEmergencia[]> = {
  'em-002': [
    {
      id: 'nt-001',
      emergencia_id: 'em-002',
      audiencia_autor: 'Interno',
      cuerpo: 'Unidad detenida en caseta. Monitoreo pendiente de confirmación.',
      creado_en: '2026-11-04T07:55:00Z',
    },
  ],
};

const viajesEmergencias: Record<string, EmergenciaViaje[]> = {
  'viaje-001': [
    { id: 'em-003', estado: 'resuelta', activada_en: '2026-11-03T22:00:00Z' },
    { id: 'em-004', estado: 'abierta', activada_en: '2026-11-04T09:00:00Z' },
  ],
};

function errorContrato(status: number, codigo: string, mensaje: string) {
  return HttpResponse.json({ codigo, mensaje }, { status });
}

function buscarCaso(eid: string): EmergenciaReaccion | undefined {
  return casos.find((c) => c.id === eid);
}

export const handlersEmergencias = [
  http.get(path('/panel/emergencias'), () =>
    HttpResponse.json({
      items: casos.filter((c) => c.estado !== 'cerrada'),
      cursor_siguiente: null,
    }),
  ),

  http.get(path('/panel/emergencias/:eid'), ({ params }) => {
    const caso = buscarCaso(String(params.eid));
    if (!caso) return errorContrato(404, 'no_encontrado', 'Emergencia no encontrada');
    const detalle: DetalleEmergenciaReaccion = { caso, viaje: VIAJE_DEMO };
    return HttpResponse.json(detalle);
  }),

  http.get(path('/panel/emergencias/:eid/notas'), ({ params }) =>
    HttpResponse.json({
      items: notasPorCaso[String(params.eid)] ?? [],
      cursor_siguiente: null,
    }),
  ),

  http.post(path('/panel/emergencias/:eid/reclamos'), async ({ params, request }) => {
    const caso = buscarCaso(String(params.eid));
    if (!caso) return errorContrato(404, 'no_encontrado', 'Emergencia no encontrada');
    const cuerpo = (await request.json()) as { version_esperada: number };
    if (caso.reclamo_activo || cuerpo.version_esperada !== caso.version_reclamo) {
      return errorContrato(409, 'conflicto_version_reclamo', 'La versión del reclamo cambió');
    }
    const reclamo = {
      id: `rc-${caso.id}`,
      conversacion_id: caso.id,
      responsable_id: 'sujeto-reaccion-demo',
      version: caso.version_reclamo + 1,
      abierto_en: new Date().toISOString(),
    };
    casos = casos.map((c) =>
      c.id === caso.id
        ? { ...c, estado: 'en_atencion', reclamo_activo: reclamo, version_reclamo: reclamo.version }
        : c,
    );
    return HttpResponse.json(reclamo, { status: 201 });
  }),

  http.delete(path('/panel/emergencias/:eid/reclamos/:rid'), ({ params, request }) => {
    const caso = buscarCaso(String(params.eid));
    if (!caso) return errorContrato(404, 'no_encontrado', 'Emergencia no encontrada');
    const version = Number(new URL(request.url).searchParams.get('version_esperada'));
    if (!caso.reclamo_activo || caso.reclamo_activo.version !== version) {
      return errorContrato(409, 'conflicto_version_reclamo', 'La versión del reclamo cambió');
    }
    casos = casos.map((c) =>
      c.id === caso.id ? { ...c, estado: 'abierta', reclamo_activo: null } : c,
    );
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(path('/panel/emergencias/:eid/resolucion'), async ({ params, request }) => {
    const caso = buscarCaso(String(params.eid));
    if (!caso) return errorContrato(404, 'no_encontrado', 'Emergencia no encontrada');
    const cuerpo = (await request.json()) as { version_esperada: number; nota: string };
    if (!cuerpo.nota || cuerpo.nota.trim().length === 0 || cuerpo.nota.length > 1000) {
      return errorContrato(400, 'solicitud_invalida', 'La nota no es válida');
    }
    if (!caso.reclamo_activo || caso.reclamo_activo.version !== cuerpo.version_esperada) {
      return errorContrato(409, 'conflicto_version_reclamo', 'La versión del reclamo cambió');
    }
    casos = casos.map((c) =>
      c.id === caso.id ? { ...c, estado: 'resuelta', resuelta_en: new Date().toISOString() } : c,
    );
    notasPorCaso[caso.id] = [
      ...(notasPorCaso[caso.id] ?? []),
      {
        id: `nt-res-${caso.id}`,
        emergencia_id: caso.id,
        audiencia_autor: 'Interno',
        cuerpo: cuerpo.nota.trim(),
        es_resolucion: true,
        creado_en: new Date().toISOString(),
      },
    ];
    return HttpResponse.json(buscarCaso(caso.id));
  }),

  http.post(path('/panel/emergencias/:eid/cierre'), ({ params }) => {
    const caso = buscarCaso(String(params.eid));
    if (!caso) return errorContrato(404, 'no_encontrado', 'Emergencia no encontrada');
    if (caso.estado !== 'resuelta') {
      return errorContrato(409, 'emergencia_cerrada', 'La emergencia no está resuelta');
    }
    casos = casos.map((c) =>
      c.id === caso.id ? { ...c, estado: 'cerrada', cerrada_en: new Date().toISOString() } : c,
    );
    return HttpResponse.json({ id: caso.id, estado: 'cerrada' });
  }),

  http.get(path('/panel/viajes/:id/emergencias'), ({ params }) =>
    HttpResponse.json({ items: viajesEmergencias[String(params.id)] ?? [] }),
  ),

  http.post(path('/panel/viajes/:id/emergencias'), async ({ params, request }) => {
    const viajeId = String(params.id);
    if (viajeId === 'viaje-terminal') {
      return errorContrato(409, 'viaje_en_estado_terminal', 'El viaje está en estado terminal');
    }
    const cuerpo = (await request.json()) as { activacion_id: string };
    const existentes = viajesEmergencias[viajeId] ?? [];
    const reentrega = existentes.find((e) => e.id === `act-${cuerpo.activacion_id}`);
    if (reentrega) return HttpResponse.json(reentrega, { status: 200 });
    const nueva: EmergenciaViaje = {
      id: `act-${cuerpo.activacion_id}`,
      estado: 'abierta',
      activada_en: new Date().toISOString(),
    };
    viajesEmergencias[viajeId] = [...existentes, nueva];
    return HttpResponse.json(nueva, { status: 201 });
  }),

  http.post(path('/panel/viajes/:id/emergencias/:eid/notas'), async ({ params, request }) => {
    const eid = String(params.eid);
    const emergencia = Object.values(viajesEmergencias)
      .flat()
      .find((e) => e.id === eid);
    if (!emergencia) return errorContrato(404, 'no_encontrado', 'Emergencia no encontrada');
    if (emergencia.estado === 'cerrada') {
      return errorContrato(409, 'emergencia_cerrada', 'La emergencia ya está cerrada');
    }
    const cuerpo = (await request.json()) as { cuerpo: string };
    if (!cuerpo.cuerpo || cuerpo.cuerpo.trim().length === 0) {
      return errorContrato(400, 'solicitud_invalida', 'La nota no es válida');
    }
    const nota: NotaEmergencia = {
      id: `nt-${Date.now()}`,
      emergencia_id: eid,
      audiencia_autor: 'Interno',
      cuerpo: cuerpo.cuerpo.trim(),
      creado_en: new Date().toISOString(),
    };
    notasPorCaso[eid] = [...(notasPorCaso[eid] ?? []), nota];
    return HttpResponse.json(nota, { status: 201 });
  }),
];
