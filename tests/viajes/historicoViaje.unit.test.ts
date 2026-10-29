/*
 * Pruebas unitarias del histórico del viaje (E8-T13, tarea 12).
 *
 * Cubre:
 * - duracionEstadia: derivación de inicio/cierre|ahora, SIN clasificar (DEC-038)
 * - visibilidadCorreccion: gesto de corrección solo para Supervisor/Coordinador
 * - wrapper historicoViaje: clasificación de 409 por `codigo` y de 403
 *
 * El wrapper se ejerce contra el cliente real (`request`) + MSW, de punta a punta.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Rol } from '@ai27-tech/contracts/roles';

import { API_PREFIX } from '@/lib/constants';
import { ApiError } from '@/lib/api/errors';
import {
  ErrorAutorizacionInsuficiente,
  ErrorCondicionYaAbierta,
  ErrorEstadiaYaCerrada,
  abrirIncidencia,
  cerrarEstadia,
  resolverIncidencia,
} from '@/lib/api/historicoViaje';
import { duracionEstadia } from '@/features/viajes/historico/duracionEstadia';
import { puedeCorregirIncidencia } from '@/features/viajes/historico/visibilidadCorreccion';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('duracionEstadia — derivación sin clasificación (DEC-038)', () => {
  it('deriva la duración de una estadía cerrada como cierre - inicio', () => {
    const inicio = '2026-10-29T10:00:00.000Z';
    const cierre = '2026-10-29T11:30:00.000Z';
    expect(duracionEstadia({ inicio, cierre })).toBe(90 * 60_000);
  });

  it('usa `ahora` para una estadía abierta (cierre null)', () => {
    const inicio = '2026-10-29T10:00:00.000Z';
    const ahora = '2026-10-29T10:45:00.000Z';
    expect(duracionEstadia({ inicio, cierre: null }, ahora)).toBe(45 * 60_000);
  });

  it('nunca es negativa y devuelve null si la fecha no es válida', () => {
    expect(duracionEstadia({ inicio: 'no-fecha', cierre: null })).toBeNull();
    expect(
      duracionEstadia({ inicio: '2026-10-29T12:00:00.000Z', cierre: '2026-10-29T10:00:00.000Z' }),
    ).toBe(0);
  });

  it('devuelve un número crudo, sin rótulo "prolongada" ni booleano de umbral', () => {
    const resultado = duracionEstadia({
      inicio: '2026-10-29T00:00:00.000Z',
      cierre: '2026-10-29T12:00:00.000Z',
    });
    expect(typeof resultado).toBe('number');
  });
});

describe('visibilidadCorreccion — gesto por rol', () => {
  it('ofrece el gesto solo a Supervisor y Coordinador', () => {
    expect(puedeCorregirIncidencia(Rol.Supervisor)).toBe(true);
    expect(puedeCorregirIncidencia(Rol.Coordinador)).toBe(true);
  });

  it('no lo ofrece a Monitorista ni a Jefe Operativo', () => {
    expect(puedeCorregirIncidencia(Rol.Monitorista)).toBe(false);
    expect(puedeCorregirIncidencia(Rol.JefeOperativo)).toBe(false);
  });
});

describe('wrapper historicoViaje — clasificación de conflictos y autorización', () => {
  it('clasifica el 409 `condicion_ya_abierta` al abrir incidencia', async () => {
    server.use(
      http.post(path('/viajes/:id/incidencias'), () =>
        HttpResponse.json({ error: { codigo: 'condicion_ya_abierta' } }, { status: 409 }),
      ),
    );
    const err = await abrirIncidencia('VJ-1', { tipo_interno: 'Desvío' }, 'token').catch((e) => e);
    expect(err).toBeInstanceOf(ErrorCondicionYaAbierta);
    expect((err as ApiError).codigo).toBe('condicion_ya_abierta');
  });

  it('clasifica el 409 `estadia_ya_cerrada` al cerrar estadía', async () => {
    server.use(
      http.patch(path('/viajes/:id/estadias/:eid'), () =>
        HttpResponse.json({ error: { codigo: 'estadia_ya_cerrada' } }, { status: 409 }),
      ),
    );
    const err = await cerrarEstadia('VJ-1', 'EST-1', 'token').catch((e) => e);
    expect(err).toBeInstanceOf(ErrorEstadiaYaCerrada);
    expect((err as ApiError).codigo).toBe('estadia_ya_cerrada');
  });

  it('clasifica el 403 al resolver incidencia como autorización insuficiente', async () => {
    server.use(
      http.patch(path('/viajes/:id/incidencias/:iid'), () =>
        HttpResponse.json({ mensaje: 'Autorización insuficiente' }, { status: 403 }),
      ),
    );
    const err = await resolverIncidencia('VJ-1', 'INC-1', { resolucion: 'ok' }, 'token').catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(ErrorAutorizacionInsuficiente);
    expect((err as ApiError).kind).toBe('noAutorizado');
  });
});
