import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { API_PREFIX } from '@/lib/constants';
import {
  construirFichaEntrada,
  datosDesdeFicha,
  esFichaConfirmada,
} from '@/features/viajes/ficha/adaptadorFichaTecnica';
import { guardarFicha, listarGps, obtenerFicha } from '@/lib/api/fichaTecnica';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('adaptador de ficha técnica', () => {
  it('construye el PATCH con tracto, contenedores no vacíos y GPS deduplicados', () => {
    const datos = datosDesdeFicha({
      viaje_id: 'VJ-1',
      tracto: { placas: 'ABC-123', economico: '', marca: 'Marca', modelo: '', color: '' },
      contenedores: [
        { economico: '', placas: '', sello: '', color: '' },
        { economico: 'C-1', placas: '', sello: 'S-1', color: '' },
      ],
      gps_ids: ['GPS-1', 'GPS-1', ''],
    });

    const entrada = construirFichaEntrada(datos);

    expect(entrada).toEqual({
      tracto: { placas: 'ABC-123', marca: 'Marca' },
      contenedores: [{ economico: 'C-1', sello: 'S-1' }],
      gps_ids: ['GPS-1'],
    });
    expect(JSON.stringify(entrada)).not.toMatch(/cuenta|amago|kit|senal|posición/i);
  });

  it('conserva cero contenedores y permite borrar el tracto con null', () => {
    const entrada = construirFichaEntrada({ tracto: null, contenedores: [], gpsIds: [] });

    expect(entrada).toEqual({ tracto: null, contenedores: [], gps_ids: [] });
  });

  it('acepta solo la respuesta de la ficha del viaje solicitado', () => {
    expect(esFichaConfirmada({ viaje_id: 'VJ-1' }, 'VJ-1')).toBe(true);
    expect(esFichaConfirmada({ viaje_id: 'VJ-2' }, 'VJ-1')).toBe(false);
    expect(esFichaConfirmada(undefined, 'VJ-1')).toBe(false);
  });
});

describe('API de ficha técnica', () => {
  it('lee la ficha y guarda usando PATCH', async () => {
    let metodo = '';
    let cuerpo: unknown;
    server.use(
      http.get(path('/viajes/:id/ficha'), () =>
        HttpResponse.json({ viaje_id: 'VJ-1', contenedores: [], gps_ids: [] }),
      ),
      http.patch(path('/viajes/:id/ficha'), async ({ request }) => {
        metodo = request.method;
        cuerpo = await request.json();
        return HttpResponse.json({ viaje_id: 'VJ-1', contenedores: [], gps_ids: [] });
      }),
    );

    const ficha = await obtenerFicha('VJ-1', 'token');
    const guardada = await guardarFicha(
      'VJ-1',
      { tracto: null, contenedores: [], gps_ids: [] },
      'token',
    );

    expect(ficha.viaje_id).toBe('VJ-1');
    expect(guardada.viaje_id).toBe('VJ-1');
    expect(metodo).toBe('PATCH');
    expect(cuerpo).toEqual({ tracto: null, contenedores: [], gps_ids: [] });
  });

  it('devuelve solo dispositivos GPS activos', async () => {
    server.use(
      http.get(path('/gps'), () =>
        HttpResponse.json({
          items: [
            { id: 'GPS-1', identificador: 'A', activo: true },
            { id: 'GPS-2', identificador: 'B', activo: false },
          ],
          cursor_siguiente: null,
        }),
      ),
    );

    await expect(listarGps('token')).resolves.toEqual([
      { id: 'GPS-1', identificador: 'A', activo: true },
    ]);
  });
});
