/*
 * Handlers del bff simulado (MSW).
 *
 * Solo cubren la sesión por ahora. Devuelven forma de contrato (snake_case) y
 * los códigos que la app clasifica en su taxonomía de errores: un 401 en login
 * se presenta como credenciales inválidas.
 */

import { http, HttpResponse } from 'msw';

import { API_PREFIX } from '@/lib/constants';
import {
  crearViajeMock,
  cuentaPorCredenciales,
  cuentaPorRefreshToken,
  listarClientesMock,
  createSessionWire,
  listarViajesMock,
  obtenerDetalleViajeMock,
  transicionarViajeMock,
  fijarEtaMock,
  completarFechaHoraMock,
  asignarEscoltaMock,
  obtenerFichaMock,
  guardarFichaMock,
  listarGpsMock,
  descargarViajeMock,
  reporteViajesMock,
  reporteEstadosMock,
  type VarianteFrescuraMock,
  listarAdjuntosMock,
  crearIntencionSubidaMock,
  descargarAdjuntoMock,
  ALMACEN_MOCK,
  listarBitacoraMock,
  registrarEntradaBitacoraMock,
  listarIncidenciasMock,
  abrirIncidenciaMock,
  resolverIncidenciaMock,
  listarEstadiasMock,
  abrirEstadiaMock,
  cerrarEstadiaMock,
  enviarMensajeMock,
  liberarReclamoMock,
  listarMensajesMock,
  listarTrabajoBandejaMock,
  marcarAtendidaMock,
  obtenerConversacionMock,
  reclamarConversacionMock,
  registrarReciboLeidoMock,
  registrarSolicitudConversaciones,
  reiniciarConversacionesMock,
  sujetoDeCuenta,
  tomarFalloConversaciones,
  type FalloConversaciones,
  type OperacionConversaciones,
} from './data';
import type { TransicionEntrada, EtaEntrada, FechaHoraEntrada } from '@/lib/contracts/viajeDetalle';
import { EstadoViaje } from '@/lib/contracts/viajeDetalle';
import { handlersEmergencias } from './emergencias';
import {
  handlersRoster,
  reservarEscoltaMock,
  unidadDelRosterMock,
  unidadReservadaEnOtroViaje,
} from './roster';
import { handlersAdministracion } from './administracion';
import type { CrearViajeEntrada } from '@/lib/contracts/viajes';
import type {
  EntradaBitacoraEntrada,
  EstadiaEntrada,
  IncidenciaEntrada,
} from '@/lib/contracts/historicoViaje';
import type { FichaTecnicaEntrada } from '@/lib/contracts/fichaTecnica';
import type { IntencionSubidaAdjuntoEntrada } from '@/lib/contracts/adjuntos';

const path = (segment: string) => `${API_PREFIX}${segment}`;

/** Variante de frescura pedida por cabecera; `fresca` por omisión. */
function varianteFrescuraMock(request: Request): VarianteFrescuraMock {
  const valor = request.headers.get('x-mock-frescura');
  if (valor === 'atrasada' || valor === 'no_informada' || valor === 'sin_datos') return valor;
  return 'fresca';
}

/*
 * E8-T15 — superficie interna de bandeja del bff (tracer.33).
 *
 * Cada handler consulta primero el fallo forzado de su operación (caída de red o
 * respuesta HTTP con `codigo` de máquina) y registra la solicitud para que las
 * pruebas puedan afirmar qué se envió (versión, `client_message_id`, cuerpo).
 */
const CODIGO_POR_STATUS: Record<number, string> = {
  401: 'no_autorizado',
  403: 'prohibido',
  404: 'no_encontrado',
  409: 'conflicto_version_reclamo',
};

function errorConversaciones(status: number, codigo?: string) {
  return HttpResponse.json(
    { codigo: codigo ?? CODIGO_POR_STATUS[status] ?? 'error_interno', mensaje: 'Error simulado' },
    { status },
  );
}

function respuestaDeFallo(fallo: FalloConversaciones) {
  return fallo.tipo === 'red'
    ? HttpResponse.error()
    : errorConversaciones(fallo.status, fallo.codigo);
}

/** Registra la solicitud y devuelve la respuesta del fallo forzado, si lo hay. */
function interceptar(
  operacion: OperacionConversaciones,
  solicitud: {
    conversacionId?: string;
    cuerpo?: Record<string, unknown>;
    query?: Record<string, string>;
  },
) {
  registrarSolicitudConversaciones({ operacion, ...solicitud });
  const fallo = tomarFalloConversaciones(operacion);
  return fallo ? respuestaDeFallo(fallo) : undefined;
}

async function leerCuerpo(request: Request): Promise<Record<string, unknown>> {
  try {
    const cuerpo: unknown = await request.json();
    return cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function numeroDeQuery(url: URL, nombre: string): number | undefined {
  const valor = url.searchParams.get(nombre);
  if (valor === null || valor === '') return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : undefined;
}

export const handlersConversaciones = [
  // GET /bandeja/trabajo — bootstrap (sin `desde_revision`) o catch-up (con ella).
  http.get(path('/bandeja/trabajo'), ({ request }) => {
    const url = new URL(request.url);
    const desde = numeroDeQuery(url, 'desde_revision');
    const cursor = url.searchParams.get('cursor');
    const query = Object.fromEntries(url.searchParams.entries());
    const forzada = interceptar(desde === undefined ? 'bandeja' : 'bandejaCatchUp', { query });
    if (forzada) return forzada;
    const resultado = listarTrabajoBandejaMock(desde ?? null, cursor);
    if (!resultado.ok) return errorConversaciones(resultado.status, resultado.codigo);
    return HttpResponse.json(resultado.valor, { status: 200 });
  }),

  // GET /conversaciones/{id}
  http.get(path('/conversaciones/:id'), ({ params }) => {
    const { id } = params as { id: string };
    const forzada = interceptar('obtener', { conversacionId: id });
    if (forzada) return forzada;
    const conversacion = obtenerConversacionMock(id);
    if (!conversacion) return errorConversaciones(404);
    return HttpResponse.json(conversacion, { status: 200 });
  }),

  // GET /conversaciones/{id}/mensajes — `antes_de` (historial) y `despues_de` (catch-up).
  http.get(path('/conversaciones/:id/mensajes'), ({ params, request }) => {
    const { id } = params as { id: string };
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const forzada = interceptar('listarMensajes', { conversacionId: id, query });
    if (forzada) return forzada;
    const antesDe = numeroDeQuery(url, 'antes_de');
    const despuesDe = numeroDeQuery(url, 'despues_de');
    const limite = numeroDeQuery(url, 'limite');
    const pagina = listarMensajesMock(id, {
      ...(antesDe !== undefined ? { antesDe } : {}),
      ...(despuesDe !== undefined ? { despuesDe } : {}),
      ...(limite !== undefined ? { limite } : {}),
    });
    if (!pagina) return errorConversaciones(404);
    return HttpResponse.json(pagina, { status: 200 });
  }),

  // POST /conversaciones/{id}/mensajes — 201 al crear, 200 en el reintento idempotente.
  http.post(path('/conversaciones/:id/mensajes'), async ({ params, request }) => {
    const { id } = params as { id: string };
    const cuerpo = await leerCuerpo(request);
    const forzada = interceptar('enviar', { conversacionId: id, cuerpo });
    if (forzada) return forzada;
    const resultado = enviarMensajeMock(id, cuerpo);
    if (!resultado.ok) return errorConversaciones(resultado.status, resultado.codigo);
    return HttpResponse.json(resultado.valor.mensaje, {
      status: resultado.valor.reintento ? 200 : 201,
    });
  }),

  // POST /conversaciones/{id}/reclamos
  http.post(path('/conversaciones/:id/reclamos'), async ({ params, request }) => {
    const { id } = params as { id: string };
    const cuerpo = await leerCuerpo(request);
    const forzada = interceptar('reclamar', { conversacionId: id, cuerpo });
    if (forzada) return forzada;
    const resultado = reclamarConversacionMock(id, cuerpo.version_esperada);
    if (!resultado.ok) return errorConversaciones(resultado.status, resultado.codigo);
    return HttpResponse.json(resultado.valor, { status: 201 });
  }),

  // DELETE /conversaciones/{id}/reclamos/{rid}?version_esperada=
  http.delete(path('/conversaciones/:id/reclamos/:rid'), ({ params, request }) => {
    const { id, rid } = params as { id: string; rid: string };
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const forzada = interceptar('liberar', { conversacionId: id, query });
    if (forzada) return forzada;
    const resultado = liberarReclamoMock(id, rid, numeroDeQuery(url, 'version_esperada'));
    if (!resultado.ok) return errorConversaciones(resultado.status, resultado.codigo);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /conversaciones/{id}/atendida
  http.post(path('/conversaciones/:id/atendida'), async ({ params, request }) => {
    const { id } = params as { id: string };
    const cuerpo = await leerCuerpo(request);
    const forzada = interceptar('atendida', { conversacionId: id, cuerpo });
    if (forzada) return forzada;
    const resultado = marcarAtendidaMock(id, cuerpo.version_esperada);
    if (!resultado.ok) return errorConversaciones(resultado.status, resultado.codigo);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /conversaciones/{id}/recibos/leido y /entregado
  http.post(path('/conversaciones/:id/recibos/:tipo'), async ({ params, request }) => {
    const { id } = params as { id: string };
    const cuerpo = await leerCuerpo(request);
    const forzada = interceptar('recibo', { conversacionId: id, cuerpo });
    if (forzada) return forzada;
    if (!registrarReciboLeidoMock(id)) return errorConversaciones(404);
    return new HttpResponse(null, { status: 204 });
  }),
];

export const handlers = [
  ...handlersRoster,
  ...handlersAdministracion,
  ...handlersEmergencias,
  ...handlersConversaciones,
  // GET /clientes ÔÇö cat├ílogo proyectado por el BFF (tracer.20). El mock devuelve
  // ├║nicamente clientes activos dentro del alcance del operador demo.
  http.get(path('/clientes'), ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(listarClientesMock(url.searchParams.get('cursor')), { status: 200 });
  }),

  // POST /viajes ÔÇö creaci├│n por Operaci├│n. El mock devuelve APROBADO.
  http.post(path('/viajes'), async ({ request }) => {
    const body = (await request.json()) as CrearViajeEntrada;
    return HttpResponse.json(crearViajeMock(body), { status: 201 });
  }),

  // GET /viajes ÔÇö listado de la bandeja (E8-T7). Filtra por `estado` y pagina por
  // `cursor` del lado del "bff" simulado; el cliente solo muestra lo que regresa.
  http.get(path('/viajes'), ({ request }) => {
    if (
      request.headers.get('x-mock-session-cut') === '1' ||
      request.headers.get('cookie')?.includes('ai27-mock-session-cut=1')
    ) {
      return HttpResponse.json({ mensaje: 'Sesi├│n finalizada' }, { status: 401 });
    }
    const url = new URL(request.url);
    const pagina = listarViajesMock(url.searchParams.get('estado'), url.searchParams.get('cursor'));
    return HttpResponse.json(pagina, { status: 200 });
  }),

  // GET /gps — catálogo registrado; el wrapper vuelve a filtrar activos como defensa.
  http.get(path('/gps'), () => {
    return HttpResponse.json(listarGpsMock(), { status: 200 });
  }),

  // GET /viajes/{id}/ficha — lectura de la ficha técnica (E8-T12).
  http.get(path('/viajes/:id/ficha'), ({ params }) => {
    const { id } = params as { id: string };
    if (!obtenerDetalleViajeMock(id)) {
      return HttpResponse.json({ mensaje: 'Viaje no encontrado' }, { status: 404 });
    }
    // Ficha sin captura: 200 con la forma vacía del contrato (tracer.40).
    const ficha = obtenerFichaMock(id) ?? {
      viaje_id: id,
      tracto: null,
      contenedores: [],
      gps_ids: [],
    };

    return HttpResponse.json(ficha, { status: 200 });
  }),

  // PATCH /viajes/{id}/ficha — guardado parcial de la ficha (E8-T12).
  http.patch(path('/viajes/:id/ficha'), async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = (await request.json()) as FichaTecnicaEntrada;
    const ficha = guardarFichaMock(id, body);

    if (!ficha) {
      return HttpResponse.json({ mensaje: 'Viaje no encontrado' }, { status: 404 });
    }

    return HttpResponse.json(ficha, { status: 200 });
  }),

  // GET /gps — catálogo registrado; el wrapper vuelve a filtrar activos como defensa.
  http.get(path('/gps'), () => {
    return HttpResponse.json(listarGpsMock(), { status: 200 });
  }),

  // GET /viajes/{id}/detalle ÔÇö detalle del viaje con estado can├│nico, destinos y eta_estimado.
  // Punto de entrada: GET /viajes/{id}/detalle (E8-T8, contrato generado tracer.15).
  http.get(path('/viajes/:id/detalle'), ({ params }) => {
    const { id } = params as { id: string };
    const detalle = obtenerDetalleViajeMock(id);

    if (!detalle) {
      return HttpResponse.json({ mensaje: 'Viaje no encontrado' }, { status: 404 });
    }

    return HttpResponse.json(detalle, { status: 200 });
  }),

  // POST /viajes/{id}/transiciones — transiciona el estado del viaje.
  // El cierre exige `motivo_cierre` y aplica sus guardas contractuales.
  http.post(path('/viajes/:id/transiciones'), async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = (await request.json()) as Partial<TransicionEntrada>;
    const a_estado = body.a_estado ?? '';
    const detalle = obtenerDetalleViajeMock(id);

    if (!detalle) {
      return HttpResponse.json({ mensaje: 'Viaje no encontrado' }, { status: 404 });
    }

    const rolSinFacultad = request.headers.get('x-mock-rol-sin-facultad');
    if (rolSinFacultad === 'true' || rolSinFacultad === '1') {
      return HttpResponse.json({ mensaje: 'Autorización insuficiente' }, { status: 403 });
    }

    if (a_estado === EstadoViaje.Cerrado) {
      const motivoValido =
        body.motivo_cierre === 'normal' || body.motivo_cierre === 'por_incidencia';
      if (!motivoValido) {
        return HttpResponse.json(
          { mensaje: 'El motivo de cierre es obligatorio.' },
          { status: 400 },
        );
      }

      // Simula la carrera entre la lectura del detalle y la confirmación.
      const incidenciaResuelta = request.headers.get('x-mock-cierre-incidencia-resuelta');
      if (incidenciaResuelta === 'true' || incidenciaResuelta === '1') {
        detalle.condiciones_activas = detalle.condiciones_activas.filter(
          (condicion) => condicion.tipo !== 'INCIDENCIA',
        );
      }

      const codigo409 = request.headers.get('x-mock-409-generico');
      const codigoConflicto = codigo409 === 'true' || codigo409 === '1' ? 'conflicto' : undefined;
      const conflicto = (codigo: string) =>
        HttpResponse.json({ error: { codigo: codigoConflicto ?? codigo } }, { status: 409 });

      if (detalle.viaje.estado === EstadoViaje.EnTransito) {
        if (body.motivo_cierre !== 'por_incidencia') {
          return conflicto('cierre_anticipado_solo_por_incidencia');
        }
        if (!detalle.condiciones_activas.some((condicion) => condicion.tipo === 'INCIDENCIA')) {
          return conflicto('cierre_anticipado_requiere_incidencia');
        }
      }

      const exito = transicionarViajeMock(id, a_estado);
      if (!exito) return conflicto('transicion_no_permitida');

      return HttpResponse.json(obtenerDetalleViajeMock(id), { status: 200 });
    }

    const exito = transicionarViajeMock(id, a_estado);

    if (!exito) {
      return HttpResponse.json({ error: { codigo: 'transicion_no_permitida' } }, { status: 409 });
    }

    // Devolver el detalle completo actualizado
    return HttpResponse.json(obtenerDetalleViajeMock(id), { status: 200 });
  }),

  // PATCH /viajes/{id}/eta ÔÇö fija el ETA manual del viaje.
  // Si el viaje est├í en estado terminal, responde 409 con c├│digo 'viaje_en_estado_terminal'.
  // Punto de entrada: PATCH /viajes/{id}/eta (E8-T8).
  http.patch(path('/viajes/:id/eta'), async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = (await request.json()) as Partial<EtaEntrada>;
    const eta_estimado = body.eta_estimado ?? '';

    const exito = fijarEtaMock(id, eta_estimado);

    if (!exito) {
      return HttpResponse.json({ error: { codigo: 'viaje_en_estado_terminal' } }, { status: 409 });
    }

    // Devolver el detalle completo actualizado
    const detalle = obtenerDetalleViajeMock(id);
    return HttpResponse.json(detalle, { status: 200 });
  }),

  // PATCH /viajes/{id}/fecha-hora ÔÇö completa/edita la fecha/hora del servicio (E8-T9).
  // Operaci├│n real del contrato desde tracer.15 (`completarFechaHora`). El mock
  // simula el contrato publicado: 404 si el viaje no existe; 400 si falta la
  // fecha/hora. El contrato declara adem├ís 409 `viaje_en_estado_terminal` cuando
  // el viaje es terminal (no ejercido por los datos demo, todos no terminales).
  http.patch(path('/viajes/:id/fecha-hora'), async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = (await request.json()) as Partial<FechaHoraEntrada>;
    const fecha_hora_servicio = body.fecha_hora_servicio ?? '';

    if (!obtenerDetalleViajeMock(id)) {
      return HttpResponse.json({ mensaje: 'Viaje no encontrado' }, { status: 404 });
    }

    const exito = completarFechaHoraMock(id, fecha_hora_servicio);

    if (!exito) {
      return HttpResponse.json({ error: { codigo: 'fecha_hora_invalida' } }, { status: 400 });
    }

    // Devolver el detalle completo actualizado
    const detalle = obtenerDetalleViajeMock(id);
    return HttpResponse.json(detalle, { status: 200 });
  }),

  // POST /viajes/{id}/asignacion ÔÇö reserva at├│mica de la escolta.
  // `x-mock-asignacion-conflicto` permite forzar el 409 de carrera en pruebas.
  // El roster vive en `./roster`: la reserva queda registrada para `obtenerAsignacion`.
  http.post(path('/viajes/:id/asignacion'), async ({ params, request }) => {
    const { id } = params as { id: string };
    let body: { unidades_ids?: unknown } = {};
    try {
      body = (await request.json()) as { unidades_ids?: unknown };
    } catch {
      // Cuerpo ausente o no JSON: se responde como solicitud inv├ílida.
    }
    const unidades_ids = body.unidades_ids;

    if (
      !Array.isArray(unidades_ids) ||
      unidades_ids.length === 0 ||
      unidades_ids.some((unidad_id) => typeof unidad_id !== 'string' || unidad_id.length === 0)
    ) {
      return HttpResponse.json({ mensaje: 'Se requiere al menos una unidad.' }, { status: 400 });
    }

    if (!obtenerDetalleViajeMock(id)) {
      return HttpResponse.json({ mensaje: 'Viaje no encontrado' }, { status: 404 });
    }

    const url = new URL(request.url);
    const conflictoForzado =
      request.headers.get('x-mock-asignacion-conflicto') === 'true' ||
      url.searchParams.get('conflicto') === '1';
    const unidadNoDisponible = unidades_ids.some(
      (unidad_id) =>
        unidadDelRosterMock(unidad_id)?.activa !== true ||
        unidadReservadaEnOtroViaje(unidad_id, id),
    );
    if (conflictoForzado || unidadNoDisponible) {
      return HttpResponse.json({ error: { codigo: 'recurso_no_disponible' } }, { status: 409 });
    }

    const asignacion = asignarEscoltaMock(id, unidades_ids);
    reservarEscoltaMock(id, unidades_ids);
    return HttpResponse.json(asignacion, { status: 200 });
  }),

  // --- E8-T17: descarga del expediente (solo lo que publica el bff) ---

  // GET /viajes/{id}/descarga — expediente del viaje. Sin 401: se ejerce en pruebas con server.use.
  http.get(path('/viajes/:id/descarga'), ({ params, request }) => {
    const { id } = params as { id: string };
    if (request.headers.get('x-mock-expediente') === 'prohibido') {
      return HttpResponse.json(
        { mensaje: 'No tienes autorización para descargar este expediente.' },
        { status: 403 },
      );
    }
    const expediente =
      request.headers.get('x-mock-expediente') === 'inexistente' ? null : descargarViajeMock(id);
    if (expediente === null) {
      return HttpResponse.json({ mensaje: 'El viaje no existe.' }, { status: 404 });
    }
    return HttpResponse.json(expediente, { status: 200 });
  }),

  // --- E8-T17 · Bloque B: dashboard (reportes del bff, datos demo) ---
  // Variantes por cabecera: `x-mock-frescura` (fresca | atrasada | no_informada | sin_datos)
  // y `x-mock-reportes: prohibido` para el 403.

  // GET /reportes/viajes — `en_curso=true` sin rango, o `desde` + `hasta` sin `en_curso`.
  http.get(path('/reportes/viajes'), ({ request }) => {
    if (request.headers.get('x-mock-reportes') === 'prohibido') {
      return HttpResponse.json({ mensaje: 'Sin autorización.' }, { status: 403 });
    }
    const url = new URL(request.url);
    const enCurso = url.searchParams.get('en_curso') === 'true';
    const tieneRango = url.searchParams.has('desde') && url.searchParams.has('hasta');
    if (!enCurso && !tieneRango) {
      return HttpResponse.json(
        { codigo: 'solicitud_invalida', mensaje: 'Solicitud inválida.' },
        { status: 400 },
      );
    }
    return HttpResponse.json(reporteViajesMock({ enCurso }, varianteFrescuraMock(request)), {
      status: 200,
    });
  }),

  // GET /reportes/estados — exige `desde` y `hasta`.
  http.get(path('/reportes/estados'), ({ request }) => {
    if (request.headers.get('x-mock-reportes') === 'prohibido') {
      return HttpResponse.json({ mensaje: 'Sin autorización.' }, { status: 403 });
    }
    const url = new URL(request.url);
    if (!url.searchParams.has('desde') || !url.searchParams.has('hasta')) {
      return HttpResponse.json(
        { codigo: 'solicitud_invalida', mensaje: 'Solicitud inválida.' },
        { status: 400 },
      );
    }
    return HttpResponse.json(reporteEstadosMock(varianteFrescuraMock(request)), { status: 200 });
  }),

  // --- E8-T17 · Bloque C: evidencia (adjuntos del bff; los bytes van al almacén simulado) ---

  // GET /viajes/{id}/adjuntos — lista de metadatos. Sin bytes.
  http.get(path('/viajes/:id/adjuntos'), ({ params, request }) => {
    const { id } = params as { id: string };
    if (request.headers.get('x-mock-adjuntos') === 'prohibido') {
      return HttpResponse.json({ mensaje: 'Sin autorización.' }, { status: 403 });
    }
    return HttpResponse.json(listarAdjuntosMock(id), { status: 200 });
  }),

  // POST /viajes/{id}/adjuntos/intenciones-subida — intención con URL de vida corta.
  http.post(path('/viajes/:id/adjuntos/intenciones-subida'), async ({ params, request }) => {
    const { id } = params as { id: string };
    if (request.headers.get('x-mock-adjuntos') === 'prohibido') {
      return HttpResponse.json({ mensaje: 'Sin autorización.' }, { status: 403 });
    }
    const rechazo = request.headers.get('x-mock-adjunto-rechazo');
    if (rechazo === 'formato' || rechazo === 'tamano') {
      // El contrato no define códigos de máquina para estos rechazos: solo `400` genérico.
      return HttpResponse.json(
        { codigo: 'solicitud_invalida', mensaje: 'Solicitud inválida.' },
        { status: 400 },
      );
    }
    const entrada = (await request.json()) as IntencionSubidaAdjuntoEntrada;
    return HttpResponse.json(crearIntencionSubidaMock(id, entrada), { status: 201 });
  }),

  // GET /viajes/{id}/adjuntos/{aid}/descarga — URL de vida corta para abrir el archivo.
  http.get(path('/viajes/:id/adjuntos/:aid/descarga'), ({ params, request }) => {
    const { id, aid } = params as { id: string; aid: string };
    if (request.headers.get('x-mock-adjuntos') === 'prohibido') {
      return HttpResponse.json({ mensaje: 'Sin autorización.' }, { status: 403 });
    }
    const autorizacion = descargarAdjuntoMock(id, aid);
    if (autorizacion === null) {
      return HttpResponse.json({ mensaje: 'No existe.' }, { status: 404 });
    }
    return HttpResponse.json(autorizacion, { status: 200 });
  }),

  // PUT al almacén simulado — acepta los bytes salvo que se fuerce el fallo.
  http.put(`${ALMACEN_MOCK}/adjuntos/:aid`, ({ request }) => {
    if (request.headers.get('x-mock-almacen') === 'fallo') {
      return new HttpResponse(null, { status: 500 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // --- E8-T13: histórico append-only (bitácora, incidencias, estadías) ---

  // GET /viajes/{id}/bitacora — lista cronológica de entradas de bitácora.
  http.get(path('/viajes/:id/bitacora'), ({ params, request }) => {
    const { id } = params as { id: string };
    const url = new URL(request.url);
    return HttpResponse.json(listarBitacoraMock(id, url.searchParams.get('cursor')), {
      status: 200,
    });
  }),

  // POST /viajes/{id}/bitacora — registra una nota (append-only).
  http.post(path('/viajes/:id/bitacora'), async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = (await request.json()) as EntradaBitacoraEntrada;
    return HttpResponse.json(registrarEntradaBitacoraMock(id, body), { status: 201 });
  }),

  // GET /viajes/{id}/incidencias — lista append-only de incidencias (tracer.22).
  http.get(path('/viajes/:id/incidencias'), ({ params, request }) => {
    const { id } = params as { id: string };
    const url = new URL(request.url);
    return HttpResponse.json(listarIncidenciasMock(id, url.searchParams.get('cursor')), {
      status: 200,
    });
  }),

  // POST /viajes/{id}/incidencias — abre una incidencia. Una segunda del mismo
  // tipo abierta responde 409 `condicion_ya_abierta` (índice único parcial).
  http.post(path('/viajes/:id/incidencias'), async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = (await request.json()) as IncidenciaEntrada;
    const resultado = abrirIncidenciaMock(id, body);
    if (resultado === 'condicion_ya_abierta') {
      return HttpResponse.json({ error: { codigo: 'condicion_ya_abierta' } }, { status: 409 });
    }
    return HttpResponse.json(resultado, { status: 201 });
  }),

  // PATCH /viajes/{id}/incidencias/{iid} — resuelve una incidencia. Resolver es
  // facultad de Supervisor/Coordinador: el header `x-mock-rol-sin-correccion`
  // fuerza el 403 que impone el `bff` para un rol sin facultad.
  http.patch(path('/viajes/:id/incidencias/:iid'), ({ params, request }) => {
    const { id, iid } = params as { id: string; iid: string };
    if (request.headers.get('x-mock-rol-sin-correccion') === '1') {
      return HttpResponse.json({ mensaje: 'Autorización insuficiente' }, { status: 403 });
    }
    const resuelta = resolverIncidenciaMock(id, iid);
    if (!resuelta) {
      return HttpResponse.json({ mensaje: 'Incidencia no encontrada' }, { status: 404 });
    }
    return HttpResponse.json(resuelta, { status: 200 });
  }),

  // GET /viajes/{id}/estadias — lista de estadías del viaje.
  http.get(path('/viajes/:id/estadias'), ({ params, request }) => {
    const { id } = params as { id: string };
    const url = new URL(request.url);
    return HttpResponse.json(listarEstadiasMock(id, url.searchParams.get('cursor')), {
      status: 200,
    });
  }),

  // POST /viajes/{id}/estadias — abre una estadía.
  http.post(path('/viajes/:id/estadias'), async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = (await request.json()) as EstadiaEntrada;
    return HttpResponse.json(abrirEstadiaMock(id, body), { status: 201 });
  }),

  // PATCH /viajes/{id}/estadias/{eid} — cierra una estadía. Cerrar una ya
  // cerrada responde 409 `estadia_ya_cerrada`.
  http.patch(path('/viajes/:id/estadias/:eid'), ({ params }) => {
    const { id, eid } = params as { id: string; eid: string };
    const resultado = cerrarEstadiaMock(id, eid);
    if (resultado === null) {
      return HttpResponse.json({ mensaje: 'Estadía no encontrada' }, { status: 404 });
    }
    if (resultado === 'estadia_ya_cerrada') {
      return HttpResponse.json({ error: { codigo: 'estadia_ya_cerrada' } }, { status: 409 });
    }
    return HttpResponse.json(resultado, { status: 200 });
  }),

  // POST /sesion — login. Valida contra el catálogo de cuentas demo.
  http.post(path('/sesion'), async ({ request }) => {
    // Un cuerpo que no es JSON se trata como credenciales vacías.
    let cuerpo: unknown = null;
    try {
      cuerpo = await request.json();
    } catch {
      // Sin cuerpo JSON: `cuerpo` queda en null.
    }
    const campos: Record<string, unknown> =
      typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>) : {};
    const { usuario, contrasena } = campos;
    const cuenta =
      typeof usuario === 'string' &&
      typeof contrasena === 'string' &&
      usuario !== '' &&
      contrasena !== ''
        ? cuentaPorCredenciales(usuario, contrasena)
        : undefined;

    if (!cuenta) {
      return HttpResponse.json({ mensaje: 'Credenciales inválidas' }, { status: 401 });
    }
    reiniciarConversacionesMock({ sujetoId: sujetoDeCuenta(cuenta) });
    return HttpResponse.json(createSessionWire(cuenta), { status: 200 });
  }),

  // POST /sesion/refresh — renueva la sesión. La cuenta sale del refresh_token, así que
  // el rol, el sub y el sesion_id de la sesión original se conservan.
  http.post(path('/sesion/refresh'), async ({ request }) => {
    if (
      request.headers.get('x-mock-session-cut') === '1' ||
      request.headers.get('cookie')?.includes('ai27-mock-session-cut=1')
    ) {
      return HttpResponse.json({ mensaje: 'Sesión revocada' }, { status: 401 });
    }
    // Un cuerpo que no es JSON se trata como refresh_token ausente.
    let cuerpo: unknown = null;
    try {
      cuerpo = await request.json();
    } catch {
      // Sin cuerpo JSON: `cuerpo` queda en null.
    }
    const campos: Record<string, unknown> =
      typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>) : {};
    const { refresh_token } = campos;
    const cuenta =
      typeof refresh_token === 'string' ? cuentaPorRefreshToken(refresh_token) : undefined;

    if (!cuenta) {
      return HttpResponse.json({ mensaje: 'Refresh token inválido' }, { status: 401 });
    }
    return HttpResponse.json(createSessionWire(cuenta), { status: 200 });
  }),

  // DELETE /sesion — cierre de sesión. Sin cuerpo.
  http.delete(path('/sesion'), () => new HttpResponse(null, { status: 204 })),
];
