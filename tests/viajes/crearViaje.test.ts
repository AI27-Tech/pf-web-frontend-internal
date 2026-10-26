import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { EstadoViaje } from '@/lib/contracts/viajes';
import {
  construirCrearViajeEntrada,
  ejecutarCreacion,
  validarDatosCrearViaje,
  type DatosCrearViaje,
} from '@/features/viajes/crear/adaptadorCrearViaje';
import { API_PREFIX } from '@/lib/constants';
import { server } from './mswServer';

const path = (segment: string) => `${API_PREFIX}${segment}`;

const datosBase: DatosCrearViaje = {
  clienteId: 'cliente-1',
  origen: 'Origen 1',
  destinos: ['Destino 1', 'Destino 2'],
  fechaHora: '2026-10-23T10:00',
  unidadesIds: [],
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('adaptador de crearViaje', () => {
  it('valida campos obligatorios y conserva el orden de destinos', () => {
    expect(
      validarDatosCrearViaje({
        ...datosBase,
        clienteId: '',
        origen: '',
        destinos: [],
        fechaHora: '',
      }),
    ).toEqual({
      cliente: 'Selecciona un cliente.',
      origen: 'Ingresa un origen.',
      destinos: 'Ingresa al menos un destino válido.',
      fechaHora: 'Ingresa una fecha y hora válida.',
    });

    expect(construirCrearViajeEntrada(datosBase).destinos).toEqual([
      { nombre: 'Destino 1' },
      { nombre: 'Destino 2' },
    ]);
  });

  it('crea sin unidades y representa APROBADO solo con la respuesta del BFF', async () => {
    let llamadasCreacion = 0;
    server.use(
      http.post(path('/viajes'), async ({ request }) => {
        llamadasCreacion += 1;
        const body = await request.json();
        expect(body).toMatchObject({
          cliente_id: 'cliente-1',
          origen: 'Origen 1',
          destinos: [{ nombre: 'Destino 1' }, { nombre: 'Destino 2' }],
        });
        return HttpResponse.json(
          { id: 'VJ-1', estado: EstadoViaje.Aprobado, origen: 'Origen 1' },
          { status: 201 },
        );
      }),
    );

    await expect(ejecutarCreacion(datosBase, 'token')).resolves.toMatchObject({
      tipo: 'aprobado',
      viaje: { id: 'VJ-1', estado: EstadoViaje.Aprobado },
    });
    expect(llamadasCreacion).toBe(1);
  });

  it('encadena una sola asignación y no infiere ASIGNADO si el contrato no devuelve estado', async () => {
    const llamadas: string[] = [];
    server.use(
      http.post(path('/viajes'), () => {
        llamadas.push('crearViaje');
        return HttpResponse.json(
          { id: 'VJ-2', estado: EstadoViaje.Aprobado, origen: 'Origen 1' },
          { status: 201 },
        );
      }),
      http.post(path('/viajes/VJ-2/asignacion'), () => {
        llamadas.push('asignarRecursos');
        return HttpResponse.json(
          {
            viaje_id: 'VJ-2',
            unidades: [{ unidad_id: 'UN-1', aptitud: [] }],
          },
          { status: 200 },
        );
      }),
    );

    const resultado = await ejecutarCreacion(
      { ...datosBase, unidadesIds: ['UN-1', 'UN-2'] },
      'token',
    );

    expect(resultado).toMatchObject({
      tipo: 'asignacion_fallida',
      viaje: { id: 'VJ-2', estado: EstadoViaje.Aprobado },
    });
    expect(llamadas).toEqual(['crearViaje', 'asignarRecursos']);
  });

  it('conserva el viaje APROBADO cuando asignarRecursos rechaza la reserva', async () => {
    server.use(
      http.post(path('/viajes'), () =>
        HttpResponse.json(
          { id: 'VJ-3', estado: EstadoViaje.Aprobado, origen: 'Origen 1' },
          { status: 201 },
        ),
      ),
      http.post(path('/viajes/VJ-3/asignacion'), () =>
        HttpResponse.json({ error: { codigo: 'recurso_no_disponible' } }, { status: 409 }),
      ),
    );

    const resultado = await ejecutarCreacion({ ...datosBase, unidadesIds: ['UN-1'] }, 'token');

    expect(resultado).toMatchObject({
      tipo: 'asignacion_fallida',
      viaje: { id: 'VJ-3', estado: EstadoViaje.Aprobado },
    });
  });
});
