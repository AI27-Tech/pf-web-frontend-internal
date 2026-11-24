/*
 * Corregir fecha y hora del servicio (M4, decisión del Lead 9) y ETA en RFC3339.
 *
 * Reemplaza a las pruebas de aprobar y rechazar del viaje (E8-T9): con `tracer.45` esas
 * decisiones son de la solicitud y se cubren en M14.
 *
 * Montan `DetalleViaje` con un QueryClientProvider de prueba y MSW contra el bff.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { DetalleViaje } from '@/features/viajes/detalle/DetalleViaje';
import { ViajeShell } from '@/features/viajes/ViajeShell';
import { API_PREFIX } from '@/lib/constants';
import { escribirFechaHora } from '../helpers/fechaHora';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const logoutSpy = vi.fn();
const navigateSpy = vi.fn();
let rolActual: string | undefined;

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: rolActual ? { id: 'u-1', rol: rolActual } : null,
    logout: logoutSpy,
  }),
}));

vi.mock('@tanstack/react-router', async () => {
  const { createElement } = await import('react');
  return {
    useNavigate: () => navigateSpy,
    Link: ({ to, children }: { to: string; children?: unknown }) =>
      createElement('a', { href: to }, children as never),
  };
});

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  logoutSpy.mockReset();
  navigateSpy.mockReset();
  rolActual = undefined;
});
afterAll(() => server.close());

/** Detalle base de un viaje `APROBADO`. */
function viajeAprobado(fechaHora: string | null) {
  return {
    viaje: {
      id: 'VJ-9',
      estado: 'APROBADO',
      origen: 'Origen de prueba',
      destinos: [{ nombre: 'Destino 1', numero_envio: 'ENV-9' }],
      fecha_hora_servicio: fechaHora,
      creado_en: new Date().toISOString(),
    },
    condiciones_activas: [],
  };
}

function renderDetalle() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <ViajeShell id="VJ-9" seccion="detalle">
      <DetalleViaje id="VJ-9" />
    </ViajeShell>,
    { wrapper: Wrapper },
  );
}

describe('corregir fecha y hora del servicio', () => {
  it.each(['jefe_operativo', 'administrador'])('%s completa la fecha y hora', async (rol) => {
    rolActual = rol;
    let recibido: string | undefined;
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(viajeAprobado(null))),
      http.patch(path('/viajes/:id/fecha-hora'), async ({ request }) => {
        // Como el bff: exige RFC3339 con zona. El control de fecha y hora da hora local sin zona.
        recibido = ((await request.json()) as { fecha_hora_servicio?: string }).fecha_hora_servicio;
        return HttpResponse.json(viajeAprobado(recibido ?? null));
      }),
    );
    renderDetalle();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Completar fecha y hora/i }));
    const campo = await screen.findByLabelText(/Fecha y hora del servicio/);
    await escribirFechaHora(user, campo, '2026-10-21T10:00');
    await user.click(screen.getByRole('button', { name: /^Confirmar$/i }));

    await waitFor(() => expect(recibido).toBe(new Date('2026-10-21T10:00').toISOString()));
  });

  it.each(['monitorista', 'supervisor', 'coordinador'])(
    '%s no ve el botón para corregirla (decisión del Lead 9)',
    async (rol) => {
      rolActual = rol;
      server.use(
        http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(viajeAprobado(null))),
      );
      renderDetalle();

      await screen.findByRole('button', { name: 'Editar ETA' });
      expect(screen.queryByRole('button', { name: /fecha y hora/i })).not.toBeInTheDocument();
    },
  );
});

describe('ETA: el valor del input local viaja en RFC3339', () => {
  it('Editar ETA manda la hora con zona, como la exige el bff', async () => {
    let recibido: string | undefined;
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(viajeAprobado(null))),
      http.patch(path('/viajes/:id/eta'), async ({ request }) => {
        recibido = ((await request.json()) as { eta_estimado?: string }).eta_estimado;
        return HttpResponse.json(viajeAprobado(null).viaje);
      }),
    );
    renderDetalle();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Editar ETA' }));
    await escribirFechaHora(user, await screen.findByLabelText(/ETA estimado/), '2026-10-21T18:30');
    await user.click(screen.getByRole('button', { name: /^Confirmar$/i }));

    await waitFor(() => expect(recibido).toBe(new Date('2026-10-21T18:30').toISOString()));
  });
});
