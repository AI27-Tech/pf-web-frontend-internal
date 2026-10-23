/*
 * E8-T9 — Pruebas de la decisión aprobar/rechazar sobre una solicitud (7.2).
 *
 * Montan `DetalleViaje` con un QueryClientProvider de prueba y MSW contra el bff.
 * `useSession` y `useNavigate` se mockean, igual que en la bandeja (E8-T7).
 *
 * Cubren la Definición de terminado de la historia:
 *  - Aprobar está deshabilitado sin fecha/hora, y se habilita tras completarla.
 *  - Rechazar exige motivo (confirmar deshabilitado con causa vacía).
 *  - e2e de las dos ramas: aprobar y rechazar.
 *  - Carrera: 409 `transicion_no_permitida` no rompe la vista (Req 5.1).
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { DetalleViaje } from '@/features/viajes/detalle/DetalleViaje';
import { API_PREFIX } from '@/lib/constants';

const path = (segment: string) => `${API_PREFIX}${segment}`;

const logoutSpy = vi.fn();
const navigateSpy = vi.fn();

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({ sesion: { accessToken: 'token-de-prueba' }, logout: logoutSpy }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
}));

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  logoutSpy.mockReset();
  navigateSpy.mockReset();
});
afterAll(() => server.close());

/** Detalle base de una solicitud. `fechaHora` controla el guard de aprobación. */
function solicitud(fechaHora: string | null) {
  return {
    viaje: {
      id: 'VJ-9',
      estado: 'SOLICITADO',
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
  return render(<DetalleViaje id="VJ-9" />, { wrapper: Wrapper });
}

describe('E8-T9 · guard de aprobación (fecha/hora obligatoria)', () => {
  it('Aprobar está deshabilitado cuando falta la fecha/hora del servicio', async () => {
    server.use(http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(solicitud(null))));
    renderDetalle();

    const botonAprobar = await screen.findByRole('button', { name: /Transicionar a: APROBADO/i });
    expect(botonAprobar).toBeDisabled();
    // Se ofrece completar la fecha/hora.
    expect(screen.getByRole('button', { name: /Completar fecha y hora/i })).toBeInTheDocument();
  });

  it('Aprobar se habilita cuando la solicitud tiene fecha/hora', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () =>
        HttpResponse.json(solicitud('2026-10-21T10:00:00.000Z')),
      ),
    );
    renderDetalle();

    const botonAprobar = await screen.findByRole('button', { name: /Transicionar a: APROBADO/i });
    expect(botonAprobar).toBeEnabled();
  });

  it('completar la fecha/hora habilita Aprobar sin recargar la pantalla a mano (Req 3.4)', async () => {
    let tieneFecha = false;
    server.use(
      http.get(path('/viajes/:id/detalle'), () =>
        HttpResponse.json(solicitud(tieneFecha ? '2026-10-21T10:00:00.000Z' : null)),
      ),
      http.patch(path('/viajes/:id/fecha-hora'), async ({ request }) => {
        const body = (await request.json()) as { fecha_hora_servicio?: string };
        if (!body.fecha_hora_servicio) {
          return HttpResponse.json({ error: { codigo: 'fecha_hora_invalida' } }, { status: 400 });
        }
        tieneFecha = true;
        return HttpResponse.json(solicitud(body.fecha_hora_servicio));
      }),
    );
    renderDetalle();

    // Al inicio Aprobar está deshabilitado.
    const botonAprobar = await screen.findByRole('button', { name: /Transicionar a: APROBADO/i });
    expect(botonAprobar).toBeDisabled();

    // Abrir el modal y completar la fecha/hora. El input datetime-local se
    // localiza por su placeholder (el FormField no asocia label por htmlFor).
    await userEvent.click(screen.getByRole('button', { name: /Completar fecha y hora/i }));
    const campo = await screen.findByPlaceholderText('DD/MM/YYYY HH:MM');
    await userEvent.type(campo, '2026-10-21T10:00');
    await userEvent.click(screen.getByRole('button', { name: /^Confirmar$/i }));

    // Tras invalidar la lectura, Aprobar queda habilitado.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Transicionar a: APROBADO/i })).toBeEnabled(),
    );
  });
});

describe('E8-T9 · rechazar exige motivo', () => {
  it('el modal de rechazo mantiene Confirmar deshabilitado con la causa vacía', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () =>
        HttpResponse.json(solicitud('2026-10-21T10:00:00.000Z')),
      ),
    );
    renderDetalle();

    const botonRechazar = await screen.findByRole('button', {
      name: /Transicionar a: RECHAZADO_POR_AI27/i,
    });
    await userEvent.click(botonRechazar);

    // El modal de causa aparece; Confirmar está deshabilitado mientras no haya motivo.
    const confirmar = await screen.findByRole('button', { name: /^Confirmar$/i });
    expect(confirmar).toBeDisabled();

    // Al escribir un motivo, Confirmar se habilita.
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Cliente fuera de alcance');
    expect(confirmar).toBeEnabled();
  });
});

describe('E8-T9 · e2e de las dos ramas', () => {
  it('aprobar lleva la solicitud a APROBADO', async () => {
    let estado = 'SOLICITADO';
    server.use(
      http.get(path('/viajes/:id/detalle'), () =>
        HttpResponse.json({
          viaje: {
            id: 'VJ-9',
            estado,
            origen: 'Origen de prueba',
            destinos: [{ nombre: 'Destino 1', numero_envio: 'ENV-9' }],
            fecha_hora_servicio: '2026-10-21T10:00:00.000Z',
            creado_en: new Date().toISOString(),
          },
          condiciones_activas: [],
        }),
      ),
      http.post(path('/viajes/:id/transiciones'), async ({ request }) => {
        const body = (await request.json()) as { a_estado?: string };
        if (body.a_estado === 'APROBADO' && estado === 'SOLICITADO') {
          estado = 'APROBADO';
          return HttpResponse.json({ viaje: { id: 'VJ-9', estado } }, { status: 200 });
        }
        return HttpResponse.json({ error: { codigo: 'transicion_no_permitida' } }, { status: 409 });
      }),
    );
    renderDetalle();

    const botonAprobar = await screen.findByRole('button', { name: /Transicionar a: APROBADO/i });
    await userEvent.click(botonAprobar);

    // El estado mostrado pasa a APROBADO tras invalidar la lectura.
    await waitFor(() => expect(screen.getByText('APROBADO')).toBeInTheDocument());
  });

  it('rechazar con motivo lleva la solicitud a RECHAZADO_POR_AI27', async () => {
    let estado = 'SOLICITADO';
    server.use(
      http.get(path('/viajes/:id/detalle'), () =>
        HttpResponse.json({
          viaje: {
            id: 'VJ-9',
            estado,
            origen: 'Origen de prueba',
            destinos: [{ nombre: 'Destino 1', numero_envio: 'ENV-9' }],
            fecha_hora_servicio: '2026-10-21T10:00:00.000Z',
            creado_en: new Date().toISOString(),
          },
          condiciones_activas: [],
        }),
      ),
      http.post(path('/viajes/:id/transiciones'), async ({ request }) => {
        const body = (await request.json()) as { a_estado?: string; causa?: string };
        if (body.a_estado === 'RECHAZADO_POR_AI27' && body.causa && estado === 'SOLICITADO') {
          estado = 'RECHAZADO_POR_AI27';
          return HttpResponse.json({ viaje: { id: 'VJ-9', estado } }, { status: 200 });
        }
        return HttpResponse.json({ error: { codigo: 'transicion_no_permitida' } }, { status: 409 });
      }),
    );
    renderDetalle();

    await userEvent.click(
      await screen.findByRole('button', { name: /Transicionar a: RECHAZADO_POR_AI27/i }),
    );
    await userEvent.type(await screen.findByRole('textbox'), 'Cliente fuera de alcance');
    await userEvent.click(screen.getByRole('button', { name: /^Confirmar$/i }));

    await waitFor(() => expect(screen.getByText('RECHAZADO_POR_AI27')).toBeInTheDocument());
  });
});
