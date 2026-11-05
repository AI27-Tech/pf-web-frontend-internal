import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  ErrorAccionNoPermitida,
  ErrorEmergenciaCerrada,
  ErrorEmergenciaNoDisponible,
  ErrorEmergenciasNoDisponible,
  ErrorNotaInvalida,
  ErrorSinAccesoEmergencias,
  ErrorViajeTerminal,
  ErrorVersionReclamoEmergencia,
  listarBandejaEmergencias,
  reclamarEmergencia,
  resolverEmergencia,
  agregarNotaEmergenciaInterno,
  activarEmergenciaInterno,
} from '@/lib/api/emergencias';
import { API_PREFIX } from '@/lib/constants';

const path = (segmento: string) => `${API_PREFIX}${segmento}`;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const TOKEN = 'token-de-prueba';

describe('wrapper de emergencias: cuerpos enviados (P1)', () => {
  it('reclamar envía la versión que recibe, sin valores fijos', async () => {
    let cuerpo: unknown;
    server.use(
      http.post(path('/panel/emergencias/em-1/reclamos'), async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ id: 'rc', version: 4 }, { status: 201 });
      }),
    );
    await reclamarEmergencia('em-1', { version_esperada: 7 }, TOKEN);
    expect(cuerpo).toEqual({ version_esperada: 7 });
  });

  it('resolver envía la versión del reclamo y la nota', async () => {
    let cuerpo: unknown;
    server.use(
      http.post(path('/panel/emergencias/em-1/resolucion'), async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ id: 'em-1', estado: 'resuelta' });
      }),
    );
    await resolverEmergencia('em-1', { version_esperada: 2, nota: 'Atendida' }, TOKEN);
    expect(cuerpo).toEqual({ version_esperada: 2, nota: 'Atendida' });
  });

  it('activar envía el activacion_id recibido', async () => {
    let cuerpo: unknown;
    server.use(
      http.post(path('/panel/viajes/v-1/emergencias'), async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ id: 'e', estado: 'abierta', activada_en: '' }, { status: 201 });
      }),
    );
    await activarEmergenciaInterno('v-1', { activacion_id: 'uuid-1' }, TOKEN);
    expect(cuerpo).toEqual({ activacion_id: 'uuid-1' });
  });
});

describe('wrapper de emergencias: clasificación de errores', () => {
  it('403 en la bandeja es sin acceso', async () => {
    server.use(
      http.get(path('/panel/emergencias'), () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
    );
    await expect(listarBandejaEmergencias(TOKEN)).rejects.toBeInstanceOf(ErrorSinAccesoEmergencias);
  });

  it('403 en una acción es acción no permitida', async () => {
    server.use(
      http.post(path('/panel/emergencias/em-1/resolucion'), () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
    );
    await expect(
      resolverEmergencia('em-1', { version_esperada: 1, nota: 'x' }, TOKEN),
    ).rejects.toBeInstanceOf(ErrorAccionNoPermitida);
  });

  it('404 es no disponible sin distinguir causa', async () => {
    server.use(
      http.get(path('/panel/emergencias'), () =>
        HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 }),
      ),
    );
    await expect(listarBandejaEmergencias(TOKEN)).rejects.toBeInstanceOf(
      ErrorEmergenciaNoDisponible,
    );
  });

  it('400 al resolver es nota inválida', async () => {
    server.use(
      http.post(path('/panel/emergencias/em-1/resolucion'), () =>
        HttpResponse.json({ codigo: 'solicitud_invalida' }, { status: 400 }),
      ),
    );
    await expect(
      resolverEmergencia('em-1', { version_esperada: 1, nota: 'x' }, TOKEN),
    ).rejects.toBeInstanceOf(ErrorNotaInvalida);
  });

  it('409 emergencia_cerrada al anotar', async () => {
    server.use(
      http.post(path('/panel/viajes/v-1/emergencias/em-1/notas'), () =>
        HttpResponse.json({ codigo: 'emergencia_cerrada' }, { status: 409 }),
      ),
    );
    await expect(
      agregarNotaEmergenciaInterno('v-1', 'em-1', { cuerpo: 'hola' }, TOKEN),
    ).rejects.toBeInstanceOf(ErrorEmergenciaCerrada);
  });

  it('409 viaje_en_estado_terminal al activar', async () => {
    server.use(
      http.post(path('/panel/viajes/v-1/emergencias'), () =>
        HttpResponse.json({ codigo: 'viaje_en_estado_terminal' }, { status: 409 }),
      ),
    );
    await expect(
      activarEmergenciaInterno('v-1', { activacion_id: 'u' }, TOKEN),
    ).rejects.toBeInstanceOf(ErrorViajeTerminal);
  });

  it('409 conflicto_version_reclamo al reclamar', async () => {
    server.use(
      http.post(path('/panel/emergencias/em-1/reclamos'), () =>
        HttpResponse.json({ codigo: 'conflicto_version_reclamo' }, { status: 409 }),
      ),
    );
    await expect(reclamarEmergencia('em-1', { version_esperada: 1 }, TOKEN)).rejects.toBeInstanceOf(
      ErrorVersionReclamoEmergencia,
    );
  });

  it('500 es error recuperable degradado', async () => {
    server.use(http.get(path('/panel/emergencias'), () => HttpResponse.json({}, { status: 500 })));
    const error = await listarBandejaEmergencias(TOKEN).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorEmergenciasNoDisponible);
    expect((error as ErrorEmergenciasNoDisponible).kind).toBe('degradado');
  });
});
