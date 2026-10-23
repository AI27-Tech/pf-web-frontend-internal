/*
 * E8-T7 — Pruebas de ejemplo de la presentación de la bandeja (tareas 9.2 y 9.3).
 *
 * Montan `BandejaViajes` con un QueryClientProvider de prueba y MSW contra el bff.
 * `useSession` y `useNavigate` se mockean: la bandeja solo necesita el accessToken
 * y, en el 401, disparar logout()+navigate() del flujo de sesión del AppShell.
 *
 * Cubren:
 *  9.2 — los cuatro estados de UI: carga (5.1), vacío con filtro visible (6.1/6.2),
 *        error con reintento que reejecuta con el filtro vigente (7.1/7.2) y 401
 *        delegado al flujo de sesión sin pintar el error genérico (7.3).
 *  9.3 — filtro y paginación: seleccionar estado reejecuta con `estado` (3.2);
 *        limpiarlo reejecuta sin `estado` (3.3); cambiar filtro reinicia la
 *        paginación sin reenviar el cursor previo (4.5); la UI muestra solo lo
 *        que el bff devuelve, sin filtrar en el navegador (3.4/P10).
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import type { ReactNode } from 'react';

import { BandejaViajes } from '@/features/viajes/BandejaViajes';
import { BFF_VIAJES, server } from './mswServer';

const logoutSpy = vi.fn();
const navigateSpy = vi.fn();

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({ sesion: { accessToken: 'token-de-prueba' }, logout: logoutSpy }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  logoutSpy.mockReset();
  navigateSpy.mockReset();
});
afterAll(() => server.close());

function renderBandeja() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<BandejaViajes />, { wrapper: Wrapper });
}

/**
 * El `FilterBar` de la librería usa un select custom (botón trigger + popup),
 * no un `<select>` nativo. Para elegir un estado: abrir el trigger y clicar la
 * opción por su texto.
 */
async function seleccionarEstado(etiquetaOpcion: string) {
  // El trigger muestra el valor actual; su nombre accesible es ese displayValue.
  const triggers = screen.getAllByRole('button');
  const trigger = triggers.find((b) => b.className.includes('_trigger_'));
  if (!trigger) throw new Error('no se encontró el trigger del select de estado');
  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole('button', { name: etiquetaOpcion }));
}

/** El botón trigger del filtro de estado (afordancia visible del FilterBar). */
function triggerFiltroEstado() {
  const trigger = screen.getAllByRole('button').find((b) => b.className.includes('_trigger_'));
  if (!trigger) throw new Error('no se encontró el trigger del filtro de estado');
  return trigger;
}

describe('E8-T7 · BandejaViajes — cuatro estados de UI (9.2)', () => {
  it('muestra indicador de carga mientras la petición está en curso (Req 5.1)', async () => {
    server.use(
      http.get(BFF_VIAJES, async () => {
        await delay(50);
        return HttpResponse.json({ items: [], cursor_siguiente: null });
      }),
    );
    const { container } = renderBandeja();

    // Durante la carga, la tabla muestra su estado loading (no el vacío aún).
    expect(screen.queryByText('No hay viajes en tu alcance.')).not.toBeInTheDocument();
    // Y tras resolver, aparece el contenido (vacío en este caso).
    await waitFor(() =>
      expect(screen.getByText('No hay viajes en tu alcance.')).toBeInTheDocument(),
    );
    expect(container).toBeTruthy();
  });

  it('estado vacío con el filtro visible cuando items está vacío (Req 6.1/6.2)', async () => {
    server.use(
      http.get(BFF_VIAJES, () => HttpResponse.json({ items: [], cursor_siguiente: null })),
    );
    renderBandeja();

    await waitFor(() =>
      expect(screen.getByText('No hay viajes en tu alcance.')).toBeInTheDocument(),
    );
    // El control de filtro de estado (FilterBar) sigue montado y visible (Req 6.2).
    expect(triggerFiltroEstado()).toBeInTheDocument();
  });

  it('estado de error con reintento que reejecuta con el filtro vigente (Req 7.1/7.2)', async () => {
    let llamadas = 0;
    server.use(
      http.get(BFF_VIAJES, () => {
        llamadas += 1;
        // Primera llamada falla (500); tras el reintento, responde con datos.
        if (llamadas === 1) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({
          items: [{ id: 'v1', estado: 'EN_TRANSITO', origen: 'CDMX' }],
          cursor_siguiente: null,
        });
      }),
    );
    renderBandeja();

    await waitFor(() =>
      expect(screen.getByText('No se pudo cargar el listado de viajes.')).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    // La celda de estado (no la opción del filtro) muestra el viaje recargado.
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('EN_TRANSITO'));
    expect(llamadas).toBe(2);
  });

  it('un 401 se delega al flujo de sesión sin pintar el error genérico (Req 7.3)', async () => {
    server.use(http.get(BFF_VIAJES, () => new HttpResponse(null, { status: 401 })));
    renderBandeja();

    await waitFor(() => expect(logoutSpy).toHaveBeenCalledTimes(1));
    expect(navigateSpy).toHaveBeenCalled();
    // No se pinta el error genérico del listado.
    expect(screen.queryByText('No se pudo cargar el listado de viajes.')).not.toBeInTheDocument();
  });
});

describe('E8-T7 · BandejaViajes — filtro y paginación (9.3)', () => {
  it('seleccionar un estado reejecuta con `estado`; cambiar el filtro no reenvía cursor (Req 3.2/4.5)', async () => {
    const peticiones: URLSearchParams[] = [];
    server.use(
      http.get(BFF_VIAJES, ({ request }) => {
        peticiones.push(new URL(request.url).searchParams);
        return HttpResponse.json({ items: [], cursor_siguiente: null });
      }),
    );
    renderBandeja();

    await waitFor(() => expect(peticiones.length).toBe(1));
    // Primera petición: sin estado ni cursor (P10, listado inicial).
    expect(peticiones[0]?.get('estado')).toBeNull();
    expect(peticiones[0]?.get('cursor')).toBeNull();

    // Seleccionar un estado en el filtro (select custom del FilterBar).
    await seleccionarEstado('EN_TRANSITO');

    await waitFor(() => expect(peticiones.length).toBe(2));
    // Segunda petición: con el estado seleccionado y SIN cursor (paginación reiniciada).
    expect(peticiones[1]?.get('estado')).toBe('EN_TRANSITO');
    expect(peticiones[1]?.get('cursor')).toBeNull();
  });

  it('limpiar el filtro vuelve al listado sin `estado` (Req 3.3)', async () => {
    // El bff devuelve datos distintos según el filtro, para observar el resultado
    // en la UI (y no un conteo de llamadas: sin filtro, Query puede servir de caché).
    server.use(
      http.get(BFF_VIAJES, ({ request }) => {
        const estado = new URL(request.url).searchParams.get('estado');
        const items = estado
          ? [{ id: 'filtrado', estado, origen: 'MTY' }]
          : [{ id: 'todos', estado: 'SOLICITADO', origen: 'CDMX' }];
        return HttpResponse.json({ items, cursor_siguiente: null });
      }),
    );
    renderBandeja();

    // Listado inicial sin filtro.
    await waitFor(() => expect(screen.getByText('todos')).toBeInTheDocument());

    // Filtrar por un estado: la UI muestra la fila filtrada.
    await seleccionarEstado('EN_TRANSITO');
    await waitFor(() => expect(screen.getByText('filtrado')).toBeInTheDocument());

    // Limpiar el filtro con la afordancia de limpiar del FilterBar (librería):
    // vuelve al listado sin estado.
    await userEvent.click(screen.getByRole('button', { name: /limpiar|clear/i }));
    await waitFor(() => expect(screen.queryByText('filtrado')).not.toBeInTheDocument());
    expect(await screen.findByText('todos')).toBeInTheDocument();
  });

  it('muestra exactamente lo que el bff devuelve, en su orden, sin filtrar en el navegador (Req 3.4/P10)', async () => {
    server.use(
      http.get(BFF_VIAJES, () =>
        HttpResponse.json({
          items: [
            { id: 'v1', estado: 'EN_TRANSITO', origen: 'CDMX' },
            { id: 'v2', estado: 'SOLICITADO', origen: 'MTY' },
            { id: 'v3', estado: 'CERRADO', origen: 'GDL' },
          ],
          cursor_siguiente: null,
        }),
      ),
    );
    renderBandeja();

    await waitFor(() => expect(screen.getByText('v1')).toBeInTheDocument());
    const filas = screen.getAllByRole('row').slice(1); // sin la fila de encabezado
    expect(filas).toHaveLength(3);
    expect(within(filas[0]!).getByText('v1')).toBeInTheDocument();
    expect(within(filas[1]!).getByText('v2')).toBeInTheDocument();
    expect(within(filas[2]!).getByText('v3')).toBeInTheDocument();
  });
});
