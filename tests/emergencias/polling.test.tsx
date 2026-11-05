import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { BandejaEmergencias } from '@/features/emergencias/BandejaEmergencias';
import { crearPollingEmergencias } from '@/features/emergencias/actualizacion';
import { API_PREFIX } from '@/lib/constants';

// Intervalo corto solo para este archivo.
vi.mock('@/lib/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/constants')>()),
  EMERGENCIAS_POLLING_MS: 30,
}));
vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { id: 'sujeto-reaccion', rol: 'reaccion' },
  }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

const path = (segmento: string) => `${API_PREFIX}${segmento}`;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

const CASO = {
  id: 'em-1',
  estado: 'abierta',
  origen: 'cliente',
  version_reclamo: 1,
  reclamo_activo: null,
  activada_en: '2026-11-04T08:00:00Z',
};

describe('polling de la bandeja (P6)', () => {
  it('un fallo de polling conserva los casos mostrados y marca la vista desactualizada', async () => {
    let llamadas = 0;
    server.use(
      http.get(path('/panel/emergencias'), () => {
        llamadas += 1;
        if (llamadas === 1) return HttpResponse.json({ items: [CASO], cursor_siguiente: null });
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    render(<BandejaEmergencias />);
    expect(await screen.findByRole('button', { name: /Abierta/ })).toBeInTheDocument();
    expect(await screen.findByText('La vista puede estar desactualizada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abierta/ })).toBeInTheDocument();
    expect(llamadas).toBeGreaterThan(1);
  });
});

describe('crearPollingEmergencias', () => {
  it('no solapa consultas: si una sigue en vuelo, el ciclo se omite', async () => {
    vi.useFakeTimers();
    let enVuelo = 0;
    let maximo = 0;
    const consultar = () => {
      enVuelo += 1;
      maximo = Math.max(maximo, enVuelo);
      return new Promise<void>((resolve) =>
        setTimeout(() => {
          enVuelo -= 1;
          resolve();
        }, 250),
      );
    };
    const polling = crearPollingEmergencias(consultar, 100);
    polling.iniciar();
    await vi.advanceTimersByTimeAsync(1000);
    polling.detener();
    vi.useRealTimers();
    expect(maximo).toBe(1);
  });
});
