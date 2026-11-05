/*
 * Pruebas del polling real de la bandeja de conversaciones (E8-T15, tarea 13).
 *
 * El mecanismo de actualización vive detrás de `FuenteActualizacion` (Requirement
 * 11.9). Aquí se verifica la implementación de polling con temporizadores falsos;
 * las pruebas de integración la sustituyen por un disparador manual para no
 * depender del reloj.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { crearPolling } from '@/features/conversaciones/actualizacion';

afterEach(() => {
  vi.useRealTimers();
});

describe('crearPolling', () => {
  it('consulta en cada intervalo y deja de hacerlo al detener', async () => {
    vi.useFakeTimers();
    const consultar = vi.fn();
    const polling = crearPolling(consultar, 1_000);

    polling.iniciar();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(consultar).toHaveBeenCalledTimes(3);

    polling.detener();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(consultar).toHaveBeenCalledTimes(3);
  });

  it('no solapa consultas: espera a que termine la que está en vuelo', async () => {
    vi.useFakeTimers();
    let liberar: () => void = () => undefined;
    const consultar = vi.fn(
      () =>
        new Promise<void>((resolver) => {
          liberar = resolver;
        }),
    );
    const polling = crearPolling(consultar, 1_000);

    polling.iniciar();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(consultar).toHaveBeenCalledTimes(1);

    liberar();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(consultar).toHaveBeenCalledTimes(2);
    polling.detener();
  });

  it('iniciar dos veces no duplica el temporizador', async () => {
    vi.useFakeTimers();
    const consultar = vi.fn();
    const polling = crearPolling(consultar, 1_000);

    polling.iniciar();
    polling.iniciar();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(consultar).toHaveBeenCalledTimes(2);
    polling.detener();
  });
});
