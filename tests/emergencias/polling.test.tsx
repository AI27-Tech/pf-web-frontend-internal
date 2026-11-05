import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('anuncio de cambios del caso abierto (10.8)', () => {
  it('un cambio de estado y de responsable por polling se anuncia en la región accesible', async () => {
    let lecturas = 0;
    server.use(
      http.get(path('/panel/emergencias'), () =>
        HttpResponse.json({ items: [CASO], cursor_siguiente: null }),
      ),
      http.get(path('/panel/emergencias/:eid/notas'), () =>
        HttpResponse.json({ items: [], cursor_siguiente: null }),
      ),
      http.get(path('/panel/emergencias/:eid'), () => {
        lecturas += 1;
        const caso =
          lecturas === 1
            ? CASO
            : {
                ...CASO,
                estado: 'en_atencion',
                version_reclamo: 2,
                reclamo_activo: {
                  id: 'rc-x',
                  conversacion_id: 'em-1',
                  responsable_id: 'otra-persona',
                  version: 2,
                  abierto_en: '2026-11-04T08:05:00Z',
                },
              };
        return HttpResponse.json({
          caso,
          viaje: {
            cliente_nombre: 'C',
            estado: 'EN_TRANSITO',
            origen: 'O',
            destinos: [],
            escolta: [],
          },
        });
      }),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    expect(
      await screen.findByText(
        'Estado: En atención. Otra persona tiene el caso.',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
  });
});

describe('acciones operativas con el polling caído (10.5)', () => {
  it('si el polling falla, reclamar sigue funcionando y muestra aviso de éxito', async () => {
    let lecturas = 0;
    let reclamos = 0;
    server.use(
      http.get(path('/panel/emergencias'), () =>
        HttpResponse.json({ items: [CASO], cursor_siguiente: null }),
      ),
      http.get(path('/panel/emergencias/:eid/notas'), () =>
        HttpResponse.json({ items: [], cursor_siguiente: null }),
      ),
      http.get(path('/panel/emergencias/:eid'), () => {
        lecturas += 1;
        // Primera lectura bien; después el polling falla de forma sostenida.
        if (lecturas === 1) {
          return HttpResponse.json({
            caso: CASO,
            viaje: {
              cliente_nombre: 'C',
              estado: 'EN_TRANSITO',
              origen: 'O',
              destinos: [],
              escolta: [],
            },
          });
        }
        return HttpResponse.json({}, { status: 500 });
      }),
      http.post(path('/panel/emergencias/:eid/reclamos'), () => {
        reclamos += 1;
        return HttpResponse.json({ id: 'rc-1', version: 2 }, { status: 201 });
      }),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    await screen.findByRole('button', { name: 'Reclamar' });
    await waitFor(() =>
      expect(screen.getAllByText('La vista puede estar desactualizada.').length).toBeGreaterThan(0),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reclamar' }));

    expect(await screen.findByText('Caso reclamado. Ya eres su responsable.')).toBeInTheDocument();
    expect(reclamos).toBe(1);
  });
});
