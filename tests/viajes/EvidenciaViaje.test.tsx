/**
 * Integración de la evidencia del viaje con MSW (E8-T17, Bloque C, tarea 29).
 * `onUnhandledRequest: 'error'`. El sondeo usa un intervalo corto para que la prueba
 * no tarde 5 segundos.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';

import { EvidenciaViaje } from '@/features/viajes/evidencia/EvidenciaViaje';
import { calcularSha256 } from '@/features/viajes/evidencia/calcularSha256';
import { API_PREFIX } from '@/lib/constants';
import type { Adjunto } from '@/lib/contracts/adjuntos';

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { rol: 'monitorista' },
  }),
}));

vi.mock('@/features/viajes/evidencia/sondeoEscaneo', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@/features/viajes/evidencia/sondeoEscaneo')>();
  return { ...original, INTERVALO_SONDEO_ESCANEO_MS: 40 };
});

const ALMACEN = 'https://almacen.test';
const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();

let clics: { href: string; rel: string }[] = [];
let client: QueryClient;

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  URL.createObjectURL = vi.fn(() => 'blob:no-usado');
  URL.revokeObjectURL = vi.fn();
});
beforeEach(() => {
  clics = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clics.push({ href: this.href, rel: this.rel });
  });
  server.use(http.get(path('/viajes/:id/adjuntos'), () => HttpResponse.json({ items: [] })));
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function adjunto(overrides: Partial<Adjunto> = {}): Adjunto {
  return {
    id: 'ADJ-1',
    viaje_id: 'VJ-1001',
    nombre: 'acta.pdf',
    tipo_medio: 'application/pdf',
    tamano_bytes: 2048,
    checksum_sha256: null,
    estado_escaneo: 'limpio',
    creado_en: '2026-11-04T10:00:00.000Z',
    ...overrides,
  };
}

function renderEvidencia() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<EvidenciaViaje id="VJ-1001" />, { wrapper: Wrapper });
}

describe('EvidenciaViaje · subida en tres pasos', () => {
  it('calcula el checksum, pide la intención, transfiere los bytes y relee la lista', async () => {
    const items: Adjunto[] = [];
    let cuerpoIntencion: unknown = null;
    let puts = 0;
    server.use(
      http.get(path('/viajes/:id/adjuntos'), () => HttpResponse.json({ items: [...items] })),
      http.post(path('/viajes/:id/adjuntos/intenciones-subida'), async ({ request }) => {
        cuerpoIntencion = await request.json();
        items.push(adjunto({ id: 'ADJ-9', nombre: 'acta.pdf', estado_escaneo: 'pendiente' }));
        return HttpResponse.json(
          {
            adjunto_id: 'ADJ-9',
            url_subida: `${ALMACEN}/adjuntos/ADJ-9`,
            expira_en: new Date(Date.now() + 600_000).toISOString(),
          },
          { status: 201 },
        );
      }),
      http.put(`${ALMACEN}/adjuntos/ADJ-9`, () => {
        puts += 1;
        return new HttpResponse(null, { status: 200 });
      }),
    );
    renderEvidencia();
    const user = userEvent.setup();
    const archivo = new File(['abc'], 'acta.pdf', { type: 'application/pdf' });

    await user.upload(screen.getByLabelText('Archivo de evidencia'), archivo);
    await user.click(screen.getByRole('button', { name: 'Subir evidencia' }));

    await waitFor(() => expect(screen.getByText('acta.pdf')).toBeInTheDocument());
    expect(cuerpoIntencion).toEqual({
      nombre: 'acta.pdf',
      tipo_medio: 'application/pdf',
      tamano_bytes: 3,
      checksum_sha256: await calcularSha256(archivo),
    });
    expect(puts).toBe(1);
  });

  it('si el PUT falla, informa el error de transferencia', async () => {
    server.use(
      http.post(path('/viajes/:id/adjuntos/intenciones-subida'), () =>
        HttpResponse.json(
          {
            adjunto_id: 'ADJ-7',
            url_subida: `${ALMACEN}/adjuntos/ADJ-7`,
            expira_en: new Date(Date.now() + 600_000).toISOString(),
          },
          { status: 201 },
        ),
      ),
      http.put(`${ALMACEN}/adjuntos/ADJ-7`, () => new HttpResponse(null, { status: 500 })),
    );
    renderEvidencia();
    const user = userEvent.setup();

    await user.upload(
      screen.getByLabelText('Archivo de evidencia'),
      new File(['x'], 'foto.jpg', { type: 'image/jpeg' }),
    );
    await user.click(screen.getByRole('button', { name: 'Subir evidencia' }));

    expect(
      await screen.findByText('No se pudo transferir el archivo. Vuelve a intentarlo.'),
    ).toBeInTheDocument();
  });

  it('un rechazo 400 del bff se comunica con el mensaje genérico', async () => {
    server.use(
      http.post(path('/viajes/:id/adjuntos/intenciones-subida'), () =>
        HttpResponse.json(
          { codigo: 'solicitud_invalida', mensaje: 'Solicitud inválida.' },
          { status: 400 },
        ),
      ),
    );
    renderEvidencia();
    const user = userEvent.setup();

    await user.upload(
      screen.getByLabelText('Archivo de evidencia'),
      new File(['x'], 'grande.bin', { type: 'application/octet-stream' }),
    );
    await user.click(screen.getByRole('button', { name: 'Subir evidencia' }));

    expect(await screen.findByText('La subida fue rechazada por el servidor.')).toBeInTheDocument();
  });

  it('una autorización vencida (403) no permite subir', async () => {
    server.use(
      http.post(path('/viajes/:id/adjuntos/intenciones-subida'), () =>
        HttpResponse.json({ mensaje: 'Sin autorización.' }, { status: 403 }),
      ),
    );
    renderEvidencia();
    const user = userEvent.setup();

    await user.upload(
      screen.getByLabelText('Archivo de evidencia'),
      new File(['x'], 'acta.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: 'Subir evidencia' }));

    expect(
      await screen.findByText('No tienes autorización para subir evidencia a este viaje.'),
    ).toBeInTheDocument();
  });
});

describe('EvidenciaViaje · estados y descarga', () => {
  it('muestra los tres estados de escaneo y solo ofrece descarga para limpio', async () => {
    server.use(
      http.get(path('/viajes/:id/adjuntos'), () =>
        HttpResponse.json({
          items: [
            adjunto({ id: 'A-1', nombre: 'pend.pdf', estado_escaneo: 'pendiente' }),
            adjunto({ id: 'A-2', nombre: 'ok.pdf', estado_escaneo: 'limpio' }),
            adjunto({ id: 'A-3', nombre: 'mal.exe', estado_escaneo: 'infectado' }),
          ],
        }),
      ),
    );
    renderEvidencia();

    expect(await screen.findByText('Escaneo pendiente')).toBeInTheDocument();
    expect(screen.getByText('Limpio')).toBeInTheDocument();
    expect(screen.getByText('Infectado')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Descargar' })).toHaveLength(1);
  });

  it('la lista vacía muestra "Sin evidencia" neutro', async () => {
    renderEvidencia();
    expect(await screen.findByText('Sin evidencia')).toBeInTheDocument();
  });

  it('la descarga pide una URL de vida corta, la abre con ancla temporal y no la persiste', async () => {
    let descargas = 0;
    server.use(
      http.get(path('/viajes/:id/adjuntos'), () =>
        HttpResponse.json({ items: [adjunto({ id: 'A-2', estado_escaneo: 'limpio' })] }),
      ),
      http.get(path('/viajes/:id/adjuntos/:aid/descarga'), () => {
        descargas += 1;
        return HttpResponse.json({
          url_descarga: `${ALMACEN}/descarga/A-2?firma=secreta`,
          expira_en: new Date(Date.now() + 300_000).toISOString(),
        });
      }),
    );
    renderEvidencia();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Descargar' }));

    await waitFor(() => expect(clics).toHaveLength(1));
    expect(descargas).toBe(1);
    expect(clics[0]?.href).toBe(`${ALMACEN}/descarga/A-2?firma=secreta`);
    expect(clics[0]?.rel).toContain('noopener');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    const enCache = JSON.stringify([
      ...client
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
      ...client
        .getMutationCache()
        .getAll()
        .map((m) => m.state),
    ]);
    expect(enCache).not.toContain('firma=secreta');
  });
});

describe('EvidenciaViaje · sondeo del escaneo', () => {
  it('relee la lista mientras haya un pendiente y deja de hacerlo al no quedar ninguno', async () => {
    let lecturas = 0;
    server.use(
      http.get(path('/viajes/:id/adjuntos'), () => {
        lecturas += 1;
        const estado = lecturas < 3 ? 'pendiente' : 'limpio';
        return HttpResponse.json({ items: [adjunto({ id: 'A-5', estado_escaneo: estado })] });
      }),
    );
    renderEvidencia();

    expect(await screen.findByText('Limpio', {}, { timeout: 2000 })).toBeInTheDocument();
    const alTerminar = lecturas;
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(lecturas).toBe(alTerminar);
  });
});
