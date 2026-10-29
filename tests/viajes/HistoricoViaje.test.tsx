/*
 * Pruebas de integración de la vista de histórico (E8-T13, tarea 13).
 *
 * Con MSW + react-query, ejercen el comportamiento probatorio:
 * - registrar una nota y verla en la bitácora sin alterar las previas;
 * - abrir y cerrar una estadía con duración derivada;
 * - segunda incidencia del mismo tipo rechazada con `condicion_ya_abierta`;
 * - resolución por Supervisor; 403 para un rol sin facultad (Monitorista);
 * - append-only: la vista no ofrece editar ni borrar.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { Rol } from '@ai27-tech/contracts/roles';

import { HistoricoViaje } from '@/features/viajes/historico/HistoricoViaje';
import { API_PREFIX } from '@/lib/constants';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();

// Rol efectivo de la sesión; cada prueba lo ajusta antes de renderizar.
let rolActual: Rol = Rol.Supervisor;
vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { id: 'u1', rol: rolActual, audiencia: 'interno' },
  }),
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  rolActual = Rol.Supervisor;
});
afterAll(() => server.close());

const bitacoraVacia = { items: [], cursor_siguiente: null };
const estadiasVacias = { items: [], cursor_siguiente: null };
const incidenciasVacias = { items: [], cursor_siguiente: null };

interface IncidenciaWire {
  id: string;
  viaje_id: string;
  tipo_interno: string;
  estado: 'en_atencion' | 'resuelta';
  abierta_en: string;
  resuelta_en: string | null;
}

/**
 * Handlers de incidencias respaldados por un store local servido por el `GET`
 * `listarIncidencias` (tracer.22). Modela el índice único parcial (una abierta
 * por viaje → 409) y la resolución append-only (agrega el cierre).
 */
function handlersIncidenciasConStore() {
  let incidencias: IncidenciaWire[] = [];
  let seq = 1;
  return [
    http.get(path('/viajes/:id/incidencias'), () =>
      HttpResponse.json({ items: [...incidencias], cursor_siguiente: null }),
    ),
    http.post(path('/viajes/:id/incidencias'), async ({ request }) => {
      const body = (await request.json()) as { tipo_interno: string };
      if (incidencias.some((i) => i.estado === 'en_atencion')) {
        return HttpResponse.json({ error: { codigo: 'condicion_ya_abierta' } }, { status: 409 });
      }
      const incidencia: IncidenciaWire = {
        id: `INC-${seq++}`,
        viaje_id: 'VJ-1',
        tipo_interno: body.tipo_interno,
        estado: 'en_atencion',
        abierta_en: '2026-10-29T10:00:00.000Z',
        resuelta_en: null,
      };
      incidencias = [...incidencias, incidencia];
      return HttpResponse.json(incidencia, { status: 201 });
    }),
    http.patch(path('/viajes/:id/incidencias/:iid'), ({ params }) => {
      const { iid } = params as { iid: string };
      incidencias = incidencias.map((i) =>
        i.id === iid ? { ...i, estado: 'resuelta', resuelta_en: '2026-10-29T11:00:00.000Z' } : i,
      );
      return HttpResponse.json(
        incidencias.find((i) => i.id === iid),
        { status: 200 },
      );
    }),
  ];
}

function entradaBitacora(texto: string, id = 'BIT-1') {
  return {
    id,
    viaje_id: 'VJ-1',
    texto,
    autor: 'Operador demo',
    ts: '2026-10-29T10:00:00.000Z',
  };
}

function renderHistorico() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<HistoricoViaje id="VJ-1" />, { wrapper: Wrapper });
}

/**
 * El `Select` de `@ai27-tech/ui` no es un `<select>` nativo: es un botón-trigger
 * cuyo nombre accesible es el placeholder, que abre un popup de opciones. Para
 * elegir un valor: abrir el trigger por su placeholder y clicar la opción.
 */
async function elegirOpcion(placeholder: string, opcion: string) {
  await userEvent.click(screen.getByRole('button', { name: placeholder }));
  await userEvent.click(await screen.findByRole('button', { name: opcion }));
}

describe('HistoricoViaje — integración (E8-T13)', () => {
  it('registra una nota y la muestra sin alterar las previas', async () => {
    const bitacora = [entradaBitacora('Nota previa', 'BIT-1')];
    server.use(
      http.get(path('/viajes/:id/bitacora'), () =>
        HttpResponse.json({ items: [...bitacora], cursor_siguiente: null }),
      ),
      http.get(path('/viajes/:id/estadias'), () => HttpResponse.json(estadiasVacias)),
      http.get(path('/viajes/:id/incidencias'), () => HttpResponse.json(incidenciasVacias)),
      http.post(path('/viajes/:id/bitacora'), async ({ request }) => {
        const body = (await request.json()) as { texto: string };
        bitacora.push(entradaBitacora(body.texto, 'BIT-2'));
        return HttpResponse.json(entradaBitacora(body.texto, 'BIT-2'), { status: 201 });
      }),
    );
    renderHistorico();

    expect(await screen.findByText('Nota previa')).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText(/Describe la observación/i),
      'Nueva nota de prueba',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Registrar nota' }));

    await waitFor(() => expect(screen.getByText('Nueva nota de prueba')).toBeInTheDocument());
    // La previa sigue presente: append-only, no se reescribe.
    expect(screen.getByText('Nota previa')).toBeInTheDocument();
  });

  it('abre y cierra una estadía, mostrando la duración derivada', async () => {
    let estadias: Array<Record<string, unknown>> = [];
    server.use(
      http.get(path('/viajes/:id/bitacora'), () => HttpResponse.json(bitacoraVacia)),
      http.get(path('/viajes/:id/incidencias'), () => HttpResponse.json(incidenciasVacias)),
      http.get(path('/viajes/:id/estadias'), () =>
        HttpResponse.json({ items: [...estadias], cursor_siguiente: null }),
      ),
      http.post(path('/viajes/:id/estadias'), async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const estadia = {
          id: 'EST-1',
          viaje_id: 'VJ-1',
          motivo: body.motivo,
          eje_autorizacion: body.eje_autorizacion,
          inicio: '2026-10-29T10:00:00.000Z',
          cierre: null,
        };
        estadias = [estadia];
        return HttpResponse.json(estadia, { status: 201 });
      }),
      http.patch(path('/viajes/:id/estadias/:eid'), () => {
        estadias = [{ ...estadias[0]!, cierre: '2026-10-29T11:00:00.000Z' }];
        return HttpResponse.json(estadias[0], { status: 200 });
      }),
    );
    renderHistorico();

    await screen.findByText('Aún no hay estadías registradas.');

    // El Select de la librería es un botón-trigger + popup (no <select> nativo):
    // abrir el trigger por su placeholder y elegir la opción por su texto.
    await elegirOpcion('Selecciona un motivo', 'Descanso');
    await elegirOpcion('Selecciona el eje de autorización', 'Autorizada');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir estadía' }));

    await waitFor(() => expect(screen.getByText('Abierta')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar estadía' }));
    await waitFor(() => expect(screen.getByText('Cerrada')).toBeInTheDocument());
    // Duración derivada de 1h entre inicio y cierre.
    expect(screen.getByText(/1h 0m/)).toBeInTheDocument();
  });

  it('rechaza una segunda incidencia del mismo tipo con condicion_ya_abierta', async () => {
    server.use(
      http.get(path('/viajes/:id/bitacora'), () => HttpResponse.json(bitacoraVacia)),
      http.get(path('/viajes/:id/estadias'), () => HttpResponse.json(estadiasVacias)),
      ...handlersIncidenciasConStore(),
    );
    renderHistorico();
    await screen.findByText('No hay incidencias registradas en este viaje.');

    await userEvent.type(screen.getByPlaceholderText(/Desvío de ruta/i), 'Desvío de ruta');
    await userEvent.click(screen.getByRole('button', { name: 'Marcar incidencia' }));
    await waitFor(() => expect(screen.getByText('En atención')).toBeInTheDocument());

    // Segunda del mismo tipo: rechazada sin romper la vista.
    await userEvent.type(screen.getByPlaceholderText(/Desvío de ruta/i), 'Otro tipo');
    await userEvent.click(screen.getByRole('button', { name: 'Marcar incidencia' }));
    await waitFor(() =>
      expect(screen.getByText(/Ya existe una incidencia abierta/i)).toBeInTheDocument(),
    );
    expect(screen.getByText('En atención')).toBeInTheDocument();
  });

  it('un Supervisor resuelve la incidencia; un Monitorista no ve el gesto', async () => {
    // Supervisor: resuelve con éxito (el cierre se agrega, no reescribe la apertura).
    rolActual = Rol.Supervisor;
    server.use(
      http.get(path('/viajes/:id/bitacora'), () => HttpResponse.json(bitacoraVacia)),
      http.get(path('/viajes/:id/estadias'), () => HttpResponse.json(estadiasVacias)),
      ...handlersIncidenciasConStore(),
    );
    renderHistorico();
    await screen.findByText('No hay incidencias registradas en este viaje.');
    await userEvent.type(screen.getByPlaceholderText(/Desvío de ruta/i), 'Desvío');
    await userEvent.click(screen.getByRole('button', { name: 'Marcar incidencia' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Resolver incidencia' }));
    await userEvent.type(
      screen.getByPlaceholderText(/Describe la resolución/i),
      'Ruta restablecida',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar resolución' }));
    await waitFor(() => expect(screen.getByText('Resuelta')).toBeInTheDocument());

    cleanup();
    server.resetHandlers();

    // Monitorista: no ve el gesto de resolver (la autoridad final es el 403 del bff).
    rolActual = Rol.Monitorista;
    server.use(
      http.get(path('/viajes/:id/bitacora'), () => HttpResponse.json(bitacoraVacia)),
      http.get(path('/viajes/:id/estadias'), () => HttpResponse.json(estadiasVacias)),
      ...handlersIncidenciasConStore(),
    );
    renderHistorico();
    await screen.findByText('No hay incidencias registradas en este viaje.');
    await userEvent.type(screen.getByPlaceholderText(/Desvío de ruta/i), 'Desvío');
    await userEvent.click(screen.getByRole('button', { name: 'Marcar incidencia' }));
    await waitFor(() => expect(screen.getByText('En atención')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Resolver incidencia' })).not.toBeInTheDocument();
  });

  it('lee el histórico de incidencias desde el GET al montar la vista', async () => {
    // El histórico de incidencias previas ahora SÍ es observable (tracer.22):
    // viene de listarIncidencias, no del estado de sesión.
    rolActual = Rol.Supervisor;
    server.use(
      http.get(path('/viajes/:id/bitacora'), () => HttpResponse.json(bitacoraVacia)),
      http.get(path('/viajes/:id/estadias'), () => HttpResponse.json(estadiasVacias)),
      http.get(path('/viajes/:id/incidencias'), () =>
        HttpResponse.json({
          items: [
            {
              id: 'INC-PREV',
              viaje_id: 'VJ-1',
              tipo_interno: 'Falla mecánica',
              estado: 'resuelta',
              abierta_en: '2026-10-28T08:00:00.000Z',
              resuelta_en: '2026-10-28T09:00:00.000Z',
            },
          ],
          cursor_siguiente: null,
        }),
      ),
    );
    renderHistorico();

    // Sin abrir nada en la sesión, la incidencia previa aparece en el histórico.
    expect(await screen.findByText('Falla mecánica')).toBeInTheDocument();
    expect(screen.getByText('Resuelta')).toBeInTheDocument();
  });

  it('la vista no ofrece editar ni borrar (append-only)', async () => {
    server.use(
      http.get(path('/viajes/:id/bitacora'), () =>
        HttpResponse.json({ items: [entradaBitacora('Nota')], cursor_siguiente: null }),
      ),
      http.get(path('/viajes/:id/estadias'), () => HttpResponse.json(estadiasVacias)),
      http.get(path('/viajes/:id/incidencias'), () => HttpResponse.json(incidenciasVacias)),
    );
    renderHistorico();
    await screen.findByText('Nota');

    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /borrar|eliminar/i })).not.toBeInTheDocument();
  });
});
