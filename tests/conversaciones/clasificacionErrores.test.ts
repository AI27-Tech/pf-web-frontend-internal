/*
 * Clasificación de errores del wrapper de la bandeja (E8-T15, tarea 12).
 *
 * Cada respuesta de falla del `bff` debe producir la clase de error esperada y un
 * `message` legible para el usuario (nunca la cadena técnica del cliente HTTP,
 * p. ej. `POST /conversaciones/… → 403`). El `401` no se reclasifica: lo resuelve
 * el flujo de sesión.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import {
  ErrorAutorizacionInsuficiente,
  ErrorConflictoVersionReclamo,
  ErrorConversacionNoDisponible,
  ErrorConversacionSoloLectura,
  ErrorNoEsResponsable,
  ErrorResyncRequerido,
  ErrorServicioNoDisponible,
  ErrorSinAcceso,
  ErrorSinBandeja,
  enviarMensaje,
  liberarReclamo,
  listarMensajes,
  listarTrabajoBandeja,
  marcarAtendida,
  obtenerConversacion,
  reclamarConversacion,
} from '@/lib/api/conversaciones';
import { TEXTOS_ERROR_CONVERSACIONES as TEXTOS } from '@/lib/api/conversacionesTextos';
import { ApiError } from '@/lib/api/errors';
import { onCut, restablecerCorte } from '@/lib/api/sessionCut';
import { API_PREFIX } from '@/lib/constants';

const TOKEN = 'token-de-prueba';
const ruta = (segmento: string) => `${API_PREFIX}${segmento}`;

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => restablecerCorte());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Metodo = 'get' | 'post' | 'delete';
type Falla = { status: number; codigo?: string } | 'red';

/** Responde a una ruta con una falla HTTP (con código de máquina opcional) o con caída de red. */
function fallar(metodo: Metodo, patron: string, falla: Falla) {
  server.use(
    http[metodo](ruta(patron), () =>
      falla === 'red'
        ? HttpResponse.error()
        : HttpResponse.json(
            { ...(falla.codigo ? { codigo: falla.codigo } : {}), mensaje: 'detalle técnico' },
            { status: falla.status },
          ),
    ),
  );
}

/** Ejecuta la llamada y devuelve el error que lanzó. */
async function capturar(llamada: () => Promise<unknown>): Promise<ApiError> {
  try {
    await llamada();
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    return e as ApiError;
  }
  throw new Error('La llamada no falló');
}

const entradaEnvio = { client_message_id: 'cmid-1', cuerpo: 'Hola', version_reclamo_esperada: 3 };

describe('lectura de la bandeja', () => {
  const llamar = () => listarTrabajoBandeja(TOKEN);

  it('403 → ErrorSinAcceso (sin membresía efectiva)', async () => {
    fallar('get', '/bandeja/trabajo', { status: 403, codigo: 'prohibido' });
    const error = await capturar(llamar);
    expect(error).toBeInstanceOf(ErrorSinAcceso);
    expect(error.status).toBe(403);
    expect(error.message).toBe(TEXTOS.sinAcceso);
  });

  it('404 → ErrorSinBandeja', async () => {
    fallar('get', '/bandeja/trabajo', { status: 404, codigo: 'no_encontrado' });
    const error = await capturar(llamar);
    expect(error).toBeInstanceOf(ErrorSinBandeja);
    expect(error.message).toBe(TEXTOS.sinBandeja);
  });

  it('409 stream_resync_required → ErrorResyncRequerido, conservando el código', async () => {
    fallar('get', '/bandeja/trabajo', { status: 409, codigo: 'stream_resync_required' });
    const error = await capturar(() => listarTrabajoBandeja(TOKEN, 7));
    expect(error).toBeInstanceOf(ErrorResyncRequerido);
    expect(error.codigo).toBe('stream_resync_required');
  });

  it('5xx → ErrorServicioNoDisponible degradado, recuperable con reintento', async () => {
    fallar('get', '/bandeja/trabajo', { status: 503, codigo: 'no_disponible' });
    const error = await capturar(llamar);
    expect(error).toBeInstanceOf(ErrorServicioNoDisponible);
    expect(error.kind).toBe('degradado');
    expect(error.status).toBe(503);
    expect(error.message).toBe(TEXTOS.servicioNoDisponible);
  });

  it('caída de red → ErrorServicioNoDisponible de clase red, sin estado HTTP', async () => {
    fallar('get', '/bandeja/trabajo', 'red');
    const error = await capturar(llamar);
    expect(error).toBeInstanceOf(ErrorServicioNoDisponible);
    expect(error.kind).toBe('red');
    expect(error.status).toBeUndefined();
    expect(error.message).toBe(TEXTOS.servicioNoDisponible);
  });

  it('401 sin refresh disponible no se reclasifica: corta la sesión una sola vez', async () => {
    const corte = vi.fn();
    const quitar = onCut(corte);
    fallar('get', '/bandeja/trabajo', { status: 401 });
    const error = await capturar(llamar);
    quitar();
    expect(error.kind).toBe('sesionFinalizada');
    expect(error.status).toBe(401);
    expect(error).not.toBeInstanceOf(ErrorServicioNoDisponible);
    expect(corte).toHaveBeenCalledTimes(1);
  });
});

describe('lectura de una conversación', () => {
  it('404 al abrir → ErrorConversacionNoDisponible, sin distinguir la causa', async () => {
    fallar('get', '/conversaciones/CNV-9', { status: 404, codigo: 'no_encontrado' });
    const error = await capturar(() => obtenerConversacion('CNV-9', TOKEN));
    expect(error).toBeInstanceOf(ErrorConversacionNoDisponible);
    expect(error).not.toBeInstanceOf(ErrorSinBandeja);
    expect(error.message).toBe(TEXTOS.conversacionNoDisponible);
  });

  it('5xx al listar mensajes → ErrorServicioNoDisponible', async () => {
    fallar('get', '/conversaciones/CNV-9/mensajes', { status: 500 });
    const error = await capturar(() => listarMensajes('CNV-9', TOKEN, { despuesDe: 4 }));
    expect(error).toBeInstanceOf(ErrorServicioNoDisponible);
  });
});

describe('enviar y reclamar', () => {
  it('403 al enviar → ErrorAutorizacionInsuficiente (no "solo el responsable")', async () => {
    fallar('post', '/conversaciones/CNV-2/mensajes', { status: 403, codigo: 'prohibido' });
    const error = await capturar(() => enviarMensaje('CNV-2', entradaEnvio, TOKEN));
    expect(error).toBeInstanceOf(ErrorAutorizacionInsuficiente);
    expect(error).not.toBeInstanceOf(ErrorNoEsResponsable);
    expect(error.message).toBe(TEXTOS.autorizacionInsuficiente);
  });

  it('403 al reclamar → ErrorAutorizacionInsuficiente', async () => {
    fallar('post', '/conversaciones/CNV-1/reclamos', { status: 403 });
    const error = await capturar(() =>
      reclamarConversacion('CNV-1', { version_esperada: 2 }, TOKEN),
    );
    expect(error).toBeInstanceOf(ErrorAutorizacionInsuficiente);
  });

  it('409 conflicto_version_reclamo → ErrorConflictoVersionReclamo (envío y reclamo)', async () => {
    fallar('post', '/conversaciones/CNV-2/mensajes', {
      status: 409,
      codigo: 'conflicto_version_reclamo',
    });
    fallar('post', '/conversaciones/CNV-1/reclamos', {
      status: 409,
      codigo: 'conflicto_version_reclamo',
    });
    const envio = await capturar(() => enviarMensaje('CNV-2', entradaEnvio, TOKEN));
    const reclamo = await capturar(() =>
      reclamarConversacion('CNV-1', { version_esperada: 2 }, TOKEN),
    );
    for (const error of [envio, reclamo]) {
      expect(error).toBeInstanceOf(ErrorConflictoVersionReclamo);
      expect(error.status).toBe(409);
      expect(error.codigo).toBe('conflicto_version_reclamo');
      expect(error.message).toBe(TEXTOS.conflictoVersionReclamo);
    }
  });

  it('409 conversacion_solo_lectura → ErrorConversacionSoloLectura', async () => {
    fallar('post', '/conversaciones/CNV-5/mensajes', {
      status: 409,
      codigo: 'conversacion_solo_lectura',
    });
    const error = await capturar(() => enviarMensaje('CNV-5', entradaEnvio, TOKEN));
    expect(error).toBeInstanceOf(ErrorConversacionSoloLectura);
    expect(error.message).toBe(TEXTOS.soloLectura);
  });

  it('404 al enviar → ErrorConversacionNoDisponible; 5xx → ErrorServicioNoDisponible', async () => {
    fallar('post', '/conversaciones/CNV-2/mensajes', { status: 404 });
    expect(await capturar(() => enviarMensaje('CNV-2', entradaEnvio, TOKEN))).toBeInstanceOf(
      ErrorConversacionNoDisponible,
    );
    fallar('post', '/conversaciones/CNV-2/mensajes', { status: 502 });
    expect(await capturar(() => enviarMensaje('CNV-2', entradaEnvio, TOKEN))).toBeInstanceOf(
      ErrorServicioNoDisponible,
    );
  });
});

describe('acciones del responsable (devolver al pool y marcar atendida)', () => {
  it('403 → ErrorNoEsResponsable', async () => {
    fallar('delete', '/conversaciones/CNV-3/reclamos/RCL-1', { status: 403, codigo: 'prohibido' });
    fallar('post', '/conversaciones/CNV-3/atendida', { status: 403, codigo: 'prohibido' });
    const liberar = await capturar(() => liberarReclamo('CNV-3', 'RCL-1', 5, TOKEN));
    const atendida = await capturar(() => marcarAtendida('CNV-3', { version_esperada: 5 }, TOKEN));
    for (const error of [liberar, atendida]) {
      expect(error).toBeInstanceOf(ErrorNoEsResponsable);
      expect(error.message).toBe(TEXTOS.soloResponsable);
    }
  });

  it('409 con o sin código conocido → ErrorConflictoVersionReclamo (versión obsoleta o sin reclamo)', async () => {
    fallar('delete', '/conversaciones/CNV-2/reclamos/RCL-1', {
      status: 409,
      codigo: 'conflicto_version_reclamo',
    });
    fallar('post', '/conversaciones/CNV-2/atendida', { status: 409, codigo: 'sin_reclamo_activo' });
    const liberar = await capturar(() => liberarReclamo('CNV-2', 'RCL-1', 3, TOKEN));
    const atendida = await capturar(() => marcarAtendida('CNV-2', { version_esperada: 3 }, TOKEN));
    expect(liberar).toBeInstanceOf(ErrorConflictoVersionReclamo);
    expect(atendida).toBeInstanceOf(ErrorConflictoVersionReclamo);
  });
});

describe('ningún error muestra la cadena técnica del cliente HTTP', () => {
  it('los mensajes de todas las clases son texto en español sin método, ruta ni flecha', async () => {
    const casos: Array<[Metodo, string, Falla, () => Promise<unknown>]> = [
      [
        'post',
        '/conversaciones/CNV-2/mensajes',
        { status: 403 },
        () => enviarMensaje('CNV-2', entradaEnvio, TOKEN),
      ],
      [
        'post',
        '/conversaciones/CNV-2/mensajes',
        { status: 500 },
        () => enviarMensaje('CNV-2', entradaEnvio, TOKEN),
      ],
      [
        'post',
        '/conversaciones/CNV-2/mensajes',
        'red',
        () => enviarMensaje('CNV-2', entradaEnvio, TOKEN),
      ],
      ['get', '/conversaciones/CNV-2', { status: 404 }, () => obtenerConversacion('CNV-2', TOKEN)],
      [
        'post',
        '/conversaciones/CNV-1/reclamos',
        { status: 403 },
        () => reclamarConversacion('CNV-1', { version_esperada: 2 }, TOKEN),
      ],
    ];
    for (const [metodo, patron, falla, llamada] of casos) {
      fallar(metodo, patron, falla);
      const error = await capturar(llamada);
      expect(error.message).not.toMatch(/→|\b(GET|POST|DELETE)\b|\/conversaciones|Fallo de red/);
    }
  });
});
