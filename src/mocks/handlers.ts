/*
 * Handlers del bff simulado (MSW).
 *
 * Solo cubren la sesión por ahora. Devuelven forma de contrato (snake_case) y
 * los códigos que la app clasifica en su taxonomía de errores: un 401 en login
 * se presenta como credenciales inválidas.
 */

import { http, HttpResponse } from 'msw';

import { API_PREFIX } from '@/lib/constants';
import type { CredencialesEntrada } from '@/lib/contracts';
import {
  DEMO_CREDENTIALS,
  createSessionWire,
  listarViajesMock,
  obtenerDetalleViajeMock,
  transicionarViajeMock,
  fijarEtaMock,
  completarFechaHoraMock,
  listarUnidadesMock,
  asignarEscoltaMock,
  UNIDADES_DEMO,
  UNIDADES_SIN_DISPONIBLES_DEMO,
} from './data';
import type { TransicionEntrada, EtaEntrada, FechaHoraEntrada } from '@/lib/contracts/viajeDetalle';

const path = (segment: string) => `${API_PREFIX}${segment}`;

export const handlers = [
  // GET /viajes — listado de la bandeja (E8-T7). Filtra por `estado` y pagina por
  // `cursor` del lado del "bff" simulado; el cliente solo muestra lo que regresa.
  http.get(path('/viajes'), ({ request }) => {
    const url = new URL(request.url);
    const pagina = listarViajesMock(url.searchParams.get('estado'), url.searchParams.get('cursor'));
    return HttpResponse.json(pagina, { status: 200 });
  }),

  // GET /viajes/{id}/detalle — detalle del viaje con estado canónico, destinos y eta_estimado.
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
  // Valida contra puedeTransicionar; si no es permitida, responde 409 con código
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

  // PATCH /viajes/{id}/eta — fija el ETA manual del viaje.
  // Si el viaje está en estado terminal, responde 409 con código 'viaje_en_estado_terminal'.
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

  // PATCH /viajes/{id}/fecha-hora — completa/edita la fecha/hora del servicio (E8-T9).
  // Operación real del contrato desde tracer.15 (`completarFechaHora`). El mock
  // simula el contrato publicado: 404 si el viaje no existe; 400 si falta la
  // fecha/hora. El contrato declara además 409 `viaje_en_estado_terminal` cuando
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

  // GET /unidades — roster esperado por E8-T10. La aptitud no se expone aquí.
  http.get(path('/unidades'), ({ request }) => {
    const url = new URL(request.url);
    const unidades =
      url.searchParams.get('sin_disponibles') === '1'
        ? UNIDADES_SIN_DISPONIBLES_DEMO
        : UNIDADES_DEMO;
    return HttpResponse.json(listarUnidadesMock(unidades), { status: 200 });
  }),

  // POST /viajes/{id}/asignacion — reserva atómica de la escolta.
  // `x-mock-asignacion-conflicto` permite forzar el 409 de carrera en pruebas.
  http.post(path('/viajes/:id/asignacion'), async ({ params, request }) => {
    const { id } = params as { id: string };
    let body: { unidades_ids?: unknown } = {};
    try {
      body = (await request.json()) as { unidades_ids?: unknown };
    } catch {
      // Cuerpo ausente o no JSON: se responde como solicitud inválida.
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

  // POST /sesion — login. Solo el operador demo entra.
  http.post(path('/sesion'), async ({ request }) => {
    const body = (await request.json()) as Partial<CredencialesEntrada>;
    const ok =
      body.usuario === DEMO_CREDENTIALS.usuario && body.contrasena === DEMO_CREDENTIALS.contrasena;

    if (!ok) {
      return HttpResponse.json({ mensaje: 'Credenciales inválidas' }, { status: 401 });
    }
    return HttpResponse.json(createSessionWire(), { status: 200 });
  }),

  // POST /sesion/refresh — renueva la sesión. El mock no valida el refresh_token.
  http.post(path('/sesion/refresh'), () => HttpResponse.json(createSessionWire(), { status: 200 })),

  // DELETE /sesion — cierre de sesión. Sin cuerpo.
  http.delete(path('/sesion'), () => new HttpResponse(null, { status: 204 })),
];
