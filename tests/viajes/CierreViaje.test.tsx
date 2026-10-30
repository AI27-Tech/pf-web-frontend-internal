import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { Rol } from '@ai27-tech/contracts/roles';

import { DetalleViaje } from '@/features/viajes/detalle/DetalleViaje';
import { onCut, restablecerCorte } from '@/lib/api/sessionCut';
import { API_PREFIX } from '@/lib/constants';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();
let rolActual: Rol = Rol.JefeOperativo;
let cerrarLlamadas = 0;

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { id: 'u1', rol: rolActual, audiencia: 'Interno' },
    logout: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  rolActual = Rol.JefeOperativo;
  cerrarLlamadas = 0;
  restablecerCorte();
});
afterAll(() => server.close());

function detalle(
  estado: string,
  condiciones: Array<{ tipo: 'INCIDENCIA' | 'SIN_SENAL'; abierta_en: string }> = [],
) {
  return {
    viaje: {
      id: 'VJ-14',
      estado,
      origen: 'Origen de prueba',
      destinos: [{ nombre: 'Destino de prueba', numero_envio: 'ENV-14' }],
      fecha_hora_servicio: '2026-10-29T10:00:00.000Z',
      creado_en: '2026-10-29T08:00:00.000Z',
    },
    condiciones_activas: condiciones,
  };
}

function renderDetalle() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<DetalleViaje id="VJ-14" />, { wrapper: Wrapper });
}

async function elegirMotivo(label: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Selecciona un motivo' }));
  await userEvent.click(await screen.findByRole('button', { name: label }));
}

describe('E8-T14 · cierre del servicio', () => {
  it('cierra normalmente y comunica una ventana de 3 días', async () => {
    let estado = 'EN_DESTINO';
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle(estado))),
      http.post(path('/viajes/:id/transiciones'), async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body).toEqual({ a_estado: 'CERRADO', motivo_cierre: 'normal' });
        estado = 'CERRADO';
        cerrarLlamadas += 1;
        return HttpResponse.json(detalle(estado));
      }),
    );
    renderDetalle();

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar servicio' }));
    await elegirMotivo('Cierre normal');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));

    await waitFor(() => expect(screen.getByText('Este viaje está cerrado.')).toBeInTheDocument());
    expect(
      screen.getByText(/durante 3 días más y después pasará a sólo lectura/),
    ).toBeInTheDocument();
    expect(cerrarLlamadas).toBe(1);
  });

  it('cierra por incidencia y comunica una ventana de 6 meses', async () => {
    let estado = 'EN_DESTINO';
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle(estado))),
      http.post(path('/viajes/:id/transiciones'), async ({ request }) => {
        const body = (await request.json()) as { motivo_cierre?: string };
        expect(body.motivo_cierre).toBe('por_incidencia');
        estado = 'CERRADO';
        return HttpResponse.json(detalle(estado));
      }),
    );
    renderDetalle();

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar servicio' }));
    await elegirMotivo('Cierre por incidencia');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));

    await waitFor(() => expect(screen.getByText(/durante 6 meses/)).toBeInTheDocument());
  });

  it('en cierre anticipado solo permite por incidencia', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () =>
        HttpResponse.json(
          detalle('EN_TRANSITO', [{ tipo: 'INCIDENCIA', abierta_en: '2026-10-30T10:00:00Z' }]),
        ),
      ),
    );
    renderDetalle();

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar servicio' }));
    expect(screen.getByRole('button', { name: /Cierre por incidencia/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirmar cierre' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Cierre normal/i })).not.toBeInTheDocument();
  });

  it('permite que Administrador cierre el servicio', async () => {
    rolActual = Rol.Administrador;
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle('EN_DESTINO'))),
    );
    renderDetalle();

    expect(await screen.findByRole('button', { name: 'Cerrar servicio' })).toBeInTheDocument();
  });

  it('no permite confirmar sin motivo', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle('EN_DESTINO'))),
    );
    renderDetalle();

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar servicio' }));
    expect(screen.getByRole('button', { name: 'Confirmar cierre' })).toBeDisabled();
  });

  it('bloquea el cierre anticipado cuando no hay incidencia abierta', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle('EN_TRANSITO'))),
    );
    renderDetalle();

    expect(await screen.findByRole('button', { name: 'Cerrar servicio' })).toBeDisabled();
    expect(
      screen.getByText('El cierre anticipado solo es válido con una incidencia abierta'),
    ).toBeInTheDocument();
  });

  it('no ofrece acciones en un viaje cerrado', async () => {
    server.use(http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle('CERRADO'))));
    renderDetalle();

    expect(await screen.findByText('Este viaje está cerrado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar servicio' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Transicionar a:/)).not.toBeInTheDocument();
  });

  it('oculta el cierre para un rol sin facultad', async () => {
    rolActual = Rol.Monitorista;
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle('EN_DESTINO'))),
    );
    renderDetalle();

    await waitFor(() => expect(screen.getByText('Detalle del Viaje: VJ-14')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Cerrar servicio' })).not.toBeInTheDocument();
  });

  it('informa la carrera 409 y vuelve a leer el detalle sin mostrar cerrado', async () => {
    let lecturas = 0;
    server.use(
      http.get(path('/viajes/:id/detalle'), () => {
        lecturas += 1;
        return HttpResponse.json(
          detalle(
            'EN_TRANSITO',
            lecturas === 1 ? [{ tipo: 'INCIDENCIA', abierta_en: '2026-10-30T10:00:00Z' }] : [],
          ),
        );
      }),
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json(
          { error: { codigo: 'cierre_anticipado_requiere_incidencia' } },
          { status: 409 },
        ),
      ),
    );
    renderDetalle();
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar servicio' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));
    await waitFor(() =>
      expect(screen.getAllByText(/El cierre anticipado requiere/).length).toBeGreaterThan(0),
    );
    expect(screen.queryByText('Este viaje está cerrado.')).not.toBeInTheDocument();
    expect(lecturas).toBeGreaterThan(1);
  });

  it('muestra el mensaje genérico cuando el runtime envía conflicto', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle('EN_DESTINO'))),
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json({ error: { codigo: 'conflicto' } }, { status: 409 }),
      ),
    );
    renderDetalle();
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar servicio' }));
    await elegirMotivo('Cierre normal');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));
    await waitFor(() =>
      expect(screen.getAllByText(/El cierre no es posible/).length).toBeGreaterThan(0),
    );
    // Texto aprobado por Producto (C6): el genérico sugiere reintentar.
    expect(
      screen.getAllByText(/Se actualizó el detalle; puedes reintentar/).length,
    ).toBeGreaterThan(0);
  });

  it('conserva el motivo si la API rechaza la solicitud con 400', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle('EN_DESTINO'))),
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json({ mensaje: 'motivo inválido' }, { status: 400 }),
      ),
    );
    renderDetalle();
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar servicio' }));
    await elegirMotivo('Cierre normal');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));
    await waitFor(() =>
      expect(screen.getAllByText('El motivo de cierre no es válido').length).toBeGreaterThan(0),
    );
    expect(screen.getByRole('button', { name: /Cierre normal/i })).toBeInTheDocument();
  });

  it('conserva el motivo después de un fallo de red', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle('EN_DESTINO'))),
      http.post(path('/viajes/:id/transiciones'), () => HttpResponse.error()),
    );
    renderDetalle();
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar servicio' }));
    await elegirMotivo('Cierre normal');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));
    await waitFor(() =>
      expect(screen.getAllByText(/No se pudo cerrar el servicio/).length).toBeGreaterThan(0),
    );
    expect(screen.getByRole('button', { name: /Cierre normal/i })).toBeInTheDocument();
  });

  it('informa 403 como falta de facultad', async () => {
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle('EN_DESTINO'))),
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json({ mensaje: 'prohibido' }, { status: 403 }),
      ),
    );
    renderDetalle();
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar servicio' }));
    await elegirMotivo('Cierre normal');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));
    await waitFor(() =>
      expect(
        screen.getAllByText('El cierre requiere Jefe Operativo o Administrador').length,
      ).toBeGreaterThan(0),
    );
  });

  it('un 403 de cierre no corta la sesión', async () => {
    const cortes: string[] = [];
    const quitar = onCut((motivo) => cortes.push(motivo));
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle('EN_DESTINO'))),
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json({ mensaje: 'prohibido' }, { status: 403 }),
      ),
    );
    renderDetalle();
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar servicio' }));
    await elegirMotivo('Cierre normal');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));
    await waitFor(() =>
      expect(
        screen.getAllByText('El cierre requiere Jefe Operativo o Administrador').length,
      ).toBeGreaterThan(0),
    );
    quitar();
    expect(cortes).toEqual([]);
  });

  it('un 401 de sesión durante el cierre se delega al corte de sesión del cliente', async () => {
    const cortes: string[] = [];
    const quitar = onCut((motivo) => cortes.push(motivo));
    server.use(
      http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle('EN_DESTINO'))),
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json({ mensaje: 'no autorizado' }, { status: 401 }),
      ),
    );
    renderDetalle();
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar servicio' }));
    await elegirMotivo('Cierre normal');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));
    await waitFor(() => expect(cortes).toEqual(['sesion_finalizada']));
    quitar();
    expect(screen.queryByText('Este viaje está cerrado.')).not.toBeInTheDocument();
  });
});
