/*
 * Handlers del bff simulado (MSW).
 *
 * Solo cubren la sesi├│n por ahora. Devuelven forma de contrato (snake_case) y
 * los c├│digos que la app clasifica en su taxonom├¡a de errores: un 401 en login
 * se presenta como credenciales inv├ílidas.
 */

import { http, HttpResponse } from 'msw';

import { API_PREFIX } from '@/lib/constants';
import type { CredencialesEntrada } from '@/lib/contracts';
import {
  DEMO_CREDENTIALS,
  crearViajeMock,
  listarClientesMock,
  createSessionWire,
  listarViajesMock,
  obtenerDetalleViajeMock,
  transicionarViajeMock,
  fijarEtaMock,
  completarFechaHoraMock,
  listarUnidadesMock,
  asignarEscoltaMock,
  obtenerFichaMock,
  guardarFichaMock,
  listarGpsMock,
  UNIDADES_DEMO,
  UNIDADES_SIN_DISPONIBLES_DEMO,
  listarBitacoraMock,
  registrarEntradaBitacoraMock,
  listarIncidenciasMock,
  abrirIncidenciaMock,
  resolverIncidenciaMock,
  listarEstadiasMock,
  abrirEstadiaMock,
  cerrarEstadiaMock,
} from './data';
import type { TransicionEntrada, EtaEntrada, FechaHoraEntrada } from '@/lib/contracts/viajeDetalle';
import type { CrearViajeEntrada } from '@/lib/contracts/viajes';
import type {
  EntradaBitacoraEntrada,
  EstadiaEntrada,
  IncidenciaEntrada,
} from '@/lib/contracts/historicoViaje';
import type { FichaTecnicaEntrada } from '@/lib/contracts/fichaTecnica';

const path = (segment: string) => `${API_PREFIX}${segment}`;

export const handlers = [
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
    const ficha = obtenerFichaMock(id);

    if (!ficha) {
      return HttpResponse.json({ mensaje: 'Ficha no encontrada' }, { status: 404 });
    }

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

  // GET /viajes/{id}/ficha — lectura de la ficha técnica (E8-T12).
  http.get(path('/viajes/:id/ficha'), ({ params }) => {
    const { id } = params as { id: string };
    const ficha = obtenerFichaMock(id);

    if (!ficha) {
      return HttpResponse.json({ mensaje: 'Ficha no encontrada' }, { status: 404 });
    }

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

  // POST /viajes/{id}/transiciones ÔÇö transiciona el estado del viaje.
  // Valida contra puedeTransicionar; si no es permitida, responde 409 con c├│digo
  // 'transicion_no_permitida'.
  // Punto de entrada: POST /viajes/{id}/transiciones (E8-T8).
  http.post(path('/viajes/:id/transiciones'), async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = (await request.json()) as Partial<TransicionEntrada>;
    const a_estado = body.a_estado ?? '';

    const exito = transicionarViajeMock(id, a_estado);

    if (!exito) {
      return HttpResponse.json({ error: { codigo: 'transicion_no_permitida' } }, { status: 409 });
    }

    // Devolver el detalle completo actualizado
    const detalle = obtenerDetalleViajeMock(id);
    return HttpResponse.json(detalle, { status: 200 });
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

  // GET /unidades ÔÇö roster esperado por E8-T10. La aptitud no se expone aqu├¡.
  http.get(path('/unidades'), ({ request }) => {
    const url = new URL(request.url);
    const unidades =
      url.searchParams.get('sin_disponibles') === '1'
        ? UNIDADES_SIN_DISPONIBLES_DEMO
        : UNIDADES_DEMO;
    return HttpResponse.json(listarUnidadesMock(unidades), { status: 200 });
  }),

  // POST /viajes/{id}/asignacion ÔÇö reserva at├│mica de la escolta.
  // `x-mock-asignacion-conflicto` permite forzar el 409 de carrera en pruebas.
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
      (unidad_id) => !UNIDADES_DEMO.some((unidad) => unidad.id === unidad_id),
    );
    if (conflictoForzado || unidadNoDisponible) {
      return HttpResponse.json({ error: { codigo: 'recurso_no_disponible' } }, { status: 409 });
    }

    const asignacion = asignarEscoltaMock(id, unidades_ids);
    return HttpResponse.json(asignacion, { status: 200 });
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

  // POST /sesion ÔÇö login. Solo el operador demo entra.
  http.post(path('/sesion'), async ({ request }) => {
    const body = (await request.json()) as Partial<CredencialesEntrada>;
    const ok =
      body.usuario === DEMO_CREDENTIALS.usuario && body.contrasena === DEMO_CREDENTIALS.contrasena;

    if (!ok) {
      return HttpResponse.json({ mensaje: 'Credenciales inv├ílidas' }, { status: 401 });
    }
    return HttpResponse.json(createSessionWire(), { status: 200 });
  }),

  // POST /sesion/refresh ÔÇö renueva la sesi├│n. El mock no valida el refresh_token.
  http.post(path('/sesion/refresh'), ({ request }) => {
    if (
      request.headers.get('x-mock-session-cut') === '1' ||
      request.headers.get('cookie')?.includes('ai27-mock-session-cut=1')
    ) {
      return HttpResponse.json({ mensaje: 'Sesi├│n revocada' }, { status: 401 });
    }
    return HttpResponse.json(createSessionWire(), { status: 200 });
  }),

  // DELETE /sesion ÔÇö cierre de sesi├│n. Sin cuerpo.
  http.delete(path('/sesion'), () => new HttpResponse(null, { status: 204 })),
];
