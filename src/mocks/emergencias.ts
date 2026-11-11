/*
 * Handlers MSW de emergencias (E8-T18). Siguen la forma de `bff` (tracer.37) y los
 * códigos de error del contrato.
 *
 * Los casos y las emergencias de cada viaje viven en el almacén
 * (`almacen-viajes.ts`). Las notas siguen en este módulo.
 */
import { http, HttpResponse } from 'msw';
import { API_PREFIX } from '@/lib/constants';
import type {
  DetalleEmergenciaReaccion,
  EmergenciaReaccion,
  EmergenciaViaje,
  NotaEmergencia,
  ViajeEmergencia,
} from '@/lib/contracts/emergencias';
import {
  esEstadoTerminalMock,
  obtenerAlmacen,
  reemplazarAlmacen,
  type RegistroViaje,
} from './almacen-viajes';
import { CLIENTES_DEMO } from './data';
import { unidadDelRosterMock } from './roster';

const path = (segmento: string) => `${API_PREFIX}${segmento}`;

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

function errorContrato(status: number, codigo: string, mensaje: string) {
  return HttpResponse.json({ codigo, mensaje }, { status });
}

/** Caso de Reacción por id, leído del almacén. */
function buscarCaso(eid: string): EmergenciaReaccion | undefined {
  return obtenerAlmacen().casos.find((c) => c.id === eid);
}

/**
 * Aplica un cambio al caso y refleja su estado en la lista de emergencias de cada
 * viaje. Devuelve el caso nuevo, o `undefined` si no existe.
 */
function actualizarCaso(
  eid: string,
  cambio: (caso: EmergenciaReaccion) => EmergenciaReaccion,
): EmergenciaReaccion | undefined {
  const almacen = obtenerAlmacen();
  const actual = almacen.casos.find((c) => c.id === eid);
  if (!actual) return undefined;
  const siguiente = cambio(actual);
  almacen.casos = almacen.casos.map((c) => (c.id === eid ? siguiente : c));
  for (const registro of Object.values(almacen.viajes)) {
    registro.emergencias = registro.emergencias.map((e) =>
      e.id === eid ? { ...e, estado: siguiente.estado } : e,
    );
  }
  reemplazarAlmacen(almacen);
  return siguiente;
}

/** Datos del viaje que Reacción necesita, proyectados desde el registro. */
function proyectarViaje(registro: RegistroViaje): ViajeEmergencia {
  const { viaje } = registro.detalle;
  return {
    cliente_nombre:
      CLIENTES_DEMO.find((cliente) => cliente.id === viaje.cliente_id)?.nombre ??
      'Sin cliente asignado',
    estado: viaje.estado,
    origen: viaje.origen,
    destinos: viaje.destinos.map((destino) => ({
      nombre: destino.nombre,
      fecha_cita: null,
      arribo: false,
    })),
    fecha_hora_servicio: viaje.fecha_hora_servicio ?? null,
    tipo_servicio: 'escolta',
    eta_estimado: viaje.eta_estimado ?? null,
    escolta: registro.escolta.flatMap((unidadId) => {
      const unidad = unidadDelRosterMock(unidadId);
      if (!unidad) return [];
      return [
        {
          tipo: unidad.tipo,
          ...(unidad.vehiculo?.economico && { economico: unidad.vehiculo.economico }),
          ...(unidad.vehiculo?.placas && { placas: unidad.vehiculo.placas }),
          custodios: (unidad.custodios ?? []).map((c) => ({ nombre: c.nombre })),
        },
      ];
    }),
  };
}

/** Registro del viaje al que pertenece una emergencia. */
function registroDeEmergencia(eid: string): RegistroViaje | undefined {
  return Object.values(obtenerAlmacen().viajes).find((r) =>
    r.emergencias.some((e) => e.id === eid),
  );
}

export const handlersEmergencias = [
  http.get(path('/panel/emergencias'), () =>
    HttpResponse.json({
      items: obtenerAlmacen().casos.filter((c) => c.estado !== 'cerrada'),
      cursor_siguiente: null,
    }),
  ),

  http.get(path('/panel/emergencias/:eid'), ({ params }) => {
    const caso = buscarCaso(String(params.eid));
    if (!caso) return errorContrato(404, 'no_encontrado', 'Emergencia no encontrada');
    const registro = registroDeEmergencia(caso.id);
    if (!registro) return errorContrato(404, 'no_encontrado', 'Viaje de la emergencia no existe');
    const detalle: DetalleEmergenciaReaccion = { caso, viaje: proyectarViaje(registro) };
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
    actualizarCaso(caso.id, (actual) => ({
      ...actual,
      estado: 'en_atencion',
      reclamo_activo: reclamo,
      version_reclamo: reclamo.version,
    }));
    return HttpResponse.json(reclamo, { status: 201 });
  }),

  http.delete(path('/panel/emergencias/:eid/reclamos/:rid'), ({ params, request }) => {
    const caso = buscarCaso(String(params.eid));
    if (!caso) return errorContrato(404, 'no_encontrado', 'Emergencia no encontrada');
    const version = Number(new URL(request.url).searchParams.get('version_esperada'));
    if (!caso.reclamo_activo || caso.reclamo_activo.version !== version) {
      return errorContrato(409, 'conflicto_version_reclamo', 'La versión del reclamo cambió');
    }
    actualizarCaso(caso.id, (actual) => ({ ...actual, estado: 'abierta', reclamo_activo: null }));
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
    const resuelto = actualizarCaso(caso.id, (actual) => ({
      ...actual,
      estado: 'resuelta',
      resuelta_en: new Date().toISOString(),
    }));
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
    return HttpResponse.json(resuelto);
  }),

  http.post(path('/panel/emergencias/:eid/cierre'), ({ params }) => {
    const caso = buscarCaso(String(params.eid));
    if (!caso) return errorContrato(404, 'no_encontrado', 'Emergencia no encontrada');
    if (caso.estado !== 'resuelta') {
      return errorContrato(409, 'emergencia_cerrada', 'La emergencia no está resuelta');
    }
    actualizarCaso(caso.id, (actual) => ({
      ...actual,
      estado: 'cerrada',
      cerrada_en: new Date().toISOString(),
    }));
    return HttpResponse.json({ id: caso.id, estado: 'cerrada' });
  }),

  http.get(path('/panel/viajes/:id/emergencias'), ({ params }) =>
    HttpResponse.json({ items: obtenerAlmacen().viajes[String(params.id)]?.emergencias ?? [] }),
  ),

  http.post(path('/panel/viajes/:id/emergencias'), async ({ params, request }) => {
    const viajeId = String(params.id);
    const almacen = obtenerAlmacen();
    const registro = almacen.viajes[viajeId];
    if (!registro) return errorContrato(404, 'no_encontrado', 'Viaje no encontrado');
    if (esEstadoTerminalMock(registro.detalle.viaje.estado)) {
      return errorContrato(409, 'viaje_en_estado_terminal', 'El viaje está en estado terminal');
    }
    const cuerpo = (await request.json()) as { activacion_id: string };
    // Mismo id para el caso y la entrada del viaje: la bandeja y el detalle lo enlazan.
    const id = `em-${cuerpo.activacion_id}`;
    const reentrega = registro.emergencias.find((e) => e.id === id);
    if (reentrega) return HttpResponse.json(reentrega, { status: 200 });

    const activada_en = new Date().toISOString();
    const nueva: EmergenciaViaje = { id, estado: 'abierta', activada_en };
    almacen.casos = [
      ...almacen.casos,
      {
        id,
        estado: 'abierta',
        origen: 'operacion',
        version_reclamo: 1,
        reclamo_activo: null,
        activada_en,
      },
    ];
    registro.emergencias = [...registro.emergencias, nueva];
    reemplazarAlmacen(almacen);
    return HttpResponse.json(nueva, { status: 201 });
  }),

  http.post(path('/panel/viajes/:id/emergencias/:eid/notas'), async ({ params, request }) => {
    const eid = String(params.eid);
    const emergencia = registroDeEmergencia(eid)?.emergencias.find((e) => e.id === eid);
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
