/*
 * Cadencia del polling de la bandeja como configuración del cliente
 * (E8-T15, Requirement 11.3): `VITE_CONVERSACIONES_POLLING_MS`, entero positivo,
 * con 15 000 ms por defecto.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONVERSACIONES_POLLING_MS_DEFECTO, leerCadenciaPolling } from '@/lib/constants';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.useRealTimers();
});

describe('leerCadenciaPolling', () => {
  it('acepta un entero positivo escrito en dígitos', () => {
    expect(leerCadenciaPolling('5000')).toBe(5000);
    expect(leerCadenciaPolling(' 250 ')).toBe(250);
    expect(leerCadenciaPolling('1')).toBe(1);
  });

  it.each([undefined, null, '', '   ', '0', '-1', '1.5', '1e3', 'abc', '10s', 5000, NaN])(
    'usa el valor por defecto con %j',
    (valor) => {
      expect(leerCadenciaPolling(valor)).toBe(CONVERSACIONES_POLLING_MS_DEFECTO);
    },
  );

  it('el valor por defecto es 15 000 ms', () => {
    expect(CONVERSACIONES_POLLING_MS_DEFECTO).toBe(15_000);
  });
});

describe('lectura desde el entorno de Vite', () => {
  it('sin variable, el polling usa 15 000 ms', async () => {
    vi.stubEnv('VITE_CONVERSACIONES_POLLING_MS', '');
    vi.resetModules();
    const { CONVERSACIONES_POLLING_MS } = await import('@/lib/constants');
    expect(CONVERSACIONES_POLLING_MS).toBe(15_000);
  });

  it('con variable válida, crearPolling consulta con esa cadencia', async () => {
    vi.stubEnv('VITE_CONVERSACIONES_POLLING_MS', '2000');
    vi.resetModules();
    vi.useFakeTimers();
    const { crearPolling } = await import('@/features/conversaciones/actualizacion');
    const consultar = vi.fn();
    const polling = crearPolling(consultar);
    polling.iniciar();
    await vi.advanceTimersByTimeAsync(1_999);
    expect(consultar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(consultar).toHaveBeenCalledTimes(1);
    polling.detener();
  });

  it('con variable inválida, crearPolling cae a 15 000 ms', async () => {
    vi.stubEnv('VITE_CONVERSACIONES_POLLING_MS', '-5');
    vi.resetModules();
    vi.useFakeTimers();
    const { crearPolling } = await import('@/features/conversaciones/actualizacion');
    const consultar = vi.fn();
    const polling = crearPolling(consultar);
    polling.iniciar();
    await vi.advanceTimersByTimeAsync(14_999);
    expect(consultar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(consultar).toHaveBeenCalledTimes(1);
    polling.detener();
  });
});
