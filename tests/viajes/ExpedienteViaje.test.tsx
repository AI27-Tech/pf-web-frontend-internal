/**
 * Integración de la descarga del expediente con MSW (E8-T17, tarea 12).
 * `onUnhandledRequest: 'error'`: cualquier llamada no prevista falla la prueba.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { ExpedienteViaje } from '@/features/viajes/expediente/ExpedienteViaje';
import { API_PREFIX } from '@/lib/constants';
import { descargarViajeMock } from '@/mocks/data';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();
const navigateSpy = vi.fn();

const sesionFalsa = vi.hoisted(() => ({ rol: 'monitorista' as string }));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { rol: sesionFalsa.rol },
    logout: vi.fn(),
  }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateSpy }));

const blobsCreados: Blob[] = [];
const anclasClic: { download: string }[] = [];
let solicitudes = 0;

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  URL.createObjectURL = vi.fn((blob: Blob) => {
    blobsCreados.push(blob);
    return 'blob:expediente-demo';
  });
  URL.revokeObjectURL = vi.fn();
});
beforeEach(() => {
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    anclasClic.push({ download: this.download });
  });
});
afterEach(() => {
  server.resetHandlers();
  navigateSpy.mockReset();
  blobsCreados.length = 0;
  anclasClic.length = 0;
  solicitudes = 0;
  sesionFalsa.rol = 'monitorista';
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function renderExpediente(id = 'VJ-1001') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ExpedienteViaje id={id} />, { wrapper: Wrapper });
}

/** Handler de descarga que cuenta solicitudes y responde con `respuesta` tras un retraso opcional. */
function handlerDescarga(respuesta: () => Response | Promise<Response>, retrasoMs = 0) {
  return http.get(path('/viajes/:id/descarga'), async () => {
    solicitudes += 1;
    if (retrasoMs > 0) await delay(retrasoMs);
    return respuesta();
  });
}

describe('ExpedienteViaje — descarga correcta', () => {
  it('una solicitud, estado "En preparación", archivo con el payload exacto y aviso de éxito', async () => {
    const payload = descargarViajeMock('VJ-1001');
    server.use(handlerDescarga(() => HttpResponse.json(payload), 50));
    renderExpediente();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar expediente' }));

    expect(await screen.findByRole('button', { name: 'En preparación' })).toBeDisabled();
    expect(await screen.findByText('Expediente descargado')).toBeInTheDocument();

    expect(solicitudes).toBe(1);
    expect(anclasClic).toEqual([{ download: 'expediente-VJ-1001.json' }]);
    expect(blobsCreados).toHaveLength(1);
    const [blob] = blobsCreados;
    if (!blob) throw new Error('No se creó el objectURL del expediente');
    expect(JSON.parse(await blob.text())).toEqual(payload);
  });
});

describe('ExpedienteViaje — una pulsación, una solicitud', () => {
  it('doble clic genera una sola solicitud', async () => {
    server.use(handlerDescarga(() => HttpResponse.json(descargarViajeMock('VJ-1001')), 80));
    renderExpediente();

    const boton = screen.getByRole('button', { name: 'Descargar expediente' });
    fireEvent.click(boton);
    fireEvent.click(boton);

    await screen.findByText('Expediente descargado');
    expect(solicitudes).toBe(1);
  });
});

describe('ExpedienteViaje — errores clasificados', () => {
  it('403 muestra autorización insuficiente, sin archivo ni datos del expediente', async () => {
    server.use(
      http.get(path('/viajes/:id/descarga'), () => {
        solicitudes += 1;
        return HttpResponse.json({ mensaje: 'prohibido' }, { status: 403 });
      }),
    );
    renderExpediente();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar expediente' }));

    expect(await screen.findByText(/No tienes autorización para descargar/)).toBeInTheDocument();
    expect(blobsCreados).toHaveLength(0);
    expect(anclasClic).toHaveLength(0);
    expect(screen.queryByText('Expediente descargado')).not.toBeInTheDocument();
  });

  it('404 muestra viaje inexistente, sin archivo', async () => {
    server.use(
      http.get(path('/viajes/:id/descarga'), () =>
        HttpResponse.json({ mensaje: 'no existe' }, { status: 404 }),
      ),
    );
    renderExpediente('VJ-x');

    fireEvent.click(screen.getByRole('button', { name: 'Descargar expediente' }));

    expect(
      await screen.findByText('El viaje no existe. No hay expediente que descargar.'),
    ).toBeInTheDocument();
    expect(blobsCreados).toHaveLength(0);
  });

  it('401 con sesión finalizada no muestra error genérico ni archivo', async () => {
    server.use(
      http.get(path('/viajes/:id/descarga'), () =>
        HttpResponse.json({ mensaje: 'no autenticado' }, { status: 401 }),
      ),
    );
    renderExpediente();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar expediente' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Descargar expediente' })).toBeEnabled(),
    );
    expect(screen.queryByText(/No se pudo preparar el expediente/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No tienes autorización/)).not.toBeInTheDocument();
    expect(blobsCreados).toHaveLength(0);
  });

  it('falla de red muestra error, rehabilita la acción y un reintento entrega el archivo', async () => {
    let intento = 0;
    server.use(
      handlerDescarga(() => {
        intento += 1;
        return intento === 1
          ? HttpResponse.error()
          : HttpResponse.json(descargarViajeMock('VJ-1001'));
      }),
    );
    renderExpediente();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar expediente' }));

    expect(await screen.findByText(/No se pudo preparar el expediente/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar expediente' })).toBeEnabled();
    expect(blobsCreados).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Descargar expediente' }));

    await screen.findByText('Expediente descargado');
    expect(solicitudes).toBe(2);
    expect(blobsCreados).toHaveLength(1);
  });
});

describe('ExpedienteViaje — roles sin acceso', () => {
  it.each(['jefe_operativo', 'ejecutivo', 'reaccion', 'cliente'])(
    'el rol %s ve acceso no autorizado y no tiene botón de descarga',
    (rol) => {
      sesionFalsa.rol = rol;
      renderExpediente();

      expect(
        screen.getByText('Este expediente no está disponible para tu rol.'),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Descargar expediente' }),
      ).not.toBeInTheDocument();
    },
  );
});
