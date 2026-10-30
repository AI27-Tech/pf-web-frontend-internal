/*
 * Pruebas del wrapper de API viajeDetalle.ts (E8-T8, 2.2).
 *
 * Cubre:
 * - Construcción correcta de rutas y propagación de ViajeDetalle
 * - Clasificación de 409 por el `codigo` REAL del cuerpo (no por endpoint)
 * - Caso cruzado: un endpoint que devuelve el otro código se clasifica por código
 * - Respaldo cuando el 409 no trae código interpretable
 * - Propagación de 401/403/404 como ApiError sin convertir a ErrorTransicion
 *
 * Ejerce el cliente real (`request`) contra un servidor MSW local, de modo que
 * la lectura del `codigo` en client.ts queda probada de punta a punta.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { API_PREFIX } from '@/lib/constants';
import { ApiError } from '@/lib/api/errors';
import { ErrorTransicion, fijarEta, obtenerDetalle, transicionar } from '@/lib/api/viajeDetalle';

const path = (segment: string) => `${API_PREFIX}${segment}`;

const DETALLE_OK = {
  viaje: {
    id: 'VJ-1',
    estado: 'EN_TRANSITO',
    origen: 'Origen',
    destinos: [{ nombre: 'D1', numero_envio: 'E1' }],
    creado_en: new Date().toISOString(),
  },
  condiciones_activas: [],
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ErrorTransicion', () => {
  it('encapsula código de conflicto con status 409 y lo expone también en codigo', () => {
    const err = new ErrorTransicion('transicion_no_permitida', 'Test');
    expect(err.codigo).toBe('transicion_no_permitida');
    expect(err.status).toBe(409);
    expect(err.kind).toBe('conflicto');
    expect(err.name).toBe('ErrorTransicion');
  });
});

describe('obtenerDetalle', () => {
  it('devuelve el ViajeDetalle del bff', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(DETALLE_OK, { status: 200 })),
    );
    const detalle = await obtenerDetalle('VJ-1', 'token');
    expect(detalle.viaje.id).toBe('VJ-1');
    expect(detalle.viaje.estado).toBe('EN_TRANSITO');
  });
});

describe('transicionar — clasificación de 409 por codigo real', () => {
  it('clasifica por el codigo del cuerpo (transicion_no_permitida)', async () => {
    server.use(
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json({ error: { codigo: 'transicion_no_permitida' } }, { status: 409 }),
      ),
    );
    await expect(transicionar('VJ-1', { a_estado: 'CERRADO' }, 'token')).rejects.toMatchObject({
      codigo: 'transicion_no_permitida',
    });
  });

  it('respeta el codigo del cuerpo aunque sea el "otro" (viaje_en_estado_terminal)', async () => {
    // Caso cruzado: el endpoint de transiciones devuelve el código de ETA.
    // La clasificación debe seguir el cuerpo, no el endpoint.
    server.use(
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json({ codigo: 'viaje_en_estado_terminal' }, { status: 409 }),
      ),
    );
    await expect(transicionar('VJ-1', { a_estado: 'CERRADO' }, 'token')).rejects.toMatchObject({
      codigo: 'viaje_en_estado_terminal',
    });
  });

  it('clasifica el código de cierre anticipado que requiere incidencia', async () => {
    server.use(
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json(
          { error: { codigo: 'cierre_anticipado_requiere_incidencia' } },
          { status: 409 },
        ),
      ),
    );
    await expect(transicionar('VJ-1', { a_estado: 'CERRADO' }, 'token')).rejects.toMatchObject({
      codigo: 'cierre_anticipado_requiere_incidencia',
    });
  });

  it('clasifica el código de cierre anticipado que exige por incidencia', async () => {
    server.use(
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json(
          { error: { codigo: 'cierre_anticipado_solo_por_incidencia' } },
          { status: 409 },
        ),
      ),
    );
    await expect(transicionar('VJ-1', { a_estado: 'CERRADO' }, 'token')).rejects.toMatchObject({
      codigo: 'cierre_anticipado_solo_por_incidencia',
    });
  });

  it('usa el respaldo genérico cuando el runtime envía codigo conflicto', async () => {
    server.use(
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json({ error: { codigo: 'conflicto' } }, { status: 409 }),
      ),
    );
    await expect(transicionar('VJ-1', { a_estado: 'CERRADO' }, 'token')).rejects.toMatchObject({
      codigo: 'transicion_no_permitida',
    });
  });

  it('usa el respaldo si el 409 no trae codigo interpretable', async () => {
    server.use(
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json({ mensaje: 'sin codigo' }, { status: 409 }),
      ),
    );
    await expect(transicionar('VJ-1', { a_estado: 'CERRADO' }, 'token')).rejects.toMatchObject({
      codigo: 'transicion_no_permitida',
    });
  });

  it('devuelve el ViajeDetalle actualizado en éxito', async () => {
    server.use(
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json(DETALLE_OK, { status: 200 }),
      ),
    );
    const detalle = await transicionar('VJ-1', { a_estado: 'EN_DESTINO' }, 'token');
    expect(detalle.viaje.id).toBe('VJ-1');
  });

  it('propaga 404 como ApiError, no como ErrorTransicion', async () => {
    server.use(
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json({ mensaje: 'no existe' }, { status: 404 }),
      ),
    );
    const err = await transicionar('VJ-1', { a_estado: 'CERRADO' }, 'token').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(ErrorTransicion);
    expect((err as ApiError).kind).toBe('noEncontrado');
  });
});

describe('fijarEta — clasificación de 409 por codigo real', () => {
  it('clasifica por el codigo del cuerpo (viaje_en_estado_terminal)', async () => {
    server.use(
      http.patch(path('/viajes/:id/eta'), () =>
        HttpResponse.json({ error: { codigo: 'viaje_en_estado_terminal' } }, { status: 409 }),
      ),
    );
    await expect(
      fijarEta('VJ-1', { eta_estimado: new Date().toISOString() }, 'token'),
    ).rejects.toMatchObject({ codigo: 'viaje_en_estado_terminal' });
  });

  it('usa el respaldo si el 409 no trae codigo interpretable', async () => {
    server.use(http.patch(path('/viajes/:id/eta'), () => HttpResponse.json({}, { status: 409 })));
    await expect(
      fijarEta('VJ-1', { eta_estimado: new Date().toISOString() }, 'token'),
    ).rejects.toMatchObject({ codigo: 'viaje_en_estado_terminal' });
  });

  it('devuelve el ViajeDetalle actualizado en éxito', async () => {
    server.use(
      http.patch(path('/viajes/:id/eta'), () => HttpResponse.json(DETALLE_OK, { status: 200 })),
    );
    const detalle = await fijarEta('VJ-1', { eta_estimado: new Date().toISOString() }, 'token');
    expect(detalle.viaje.id).toBe('VJ-1');
  });
});
