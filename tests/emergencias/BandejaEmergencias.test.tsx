import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { BandejaEmergencias } from '@/features/emergencias/BandejaEmergencias';
import { API_PREFIX } from '@/lib/constants';

const sesion = vi.hoisted(() => ({
  value: { usuario: { id: 'sujeto-reaccion', rol: 'reaccion' } },
}));
const navegar = vi.hoisted(() => vi.fn());

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: sesion.value.usuario,
  }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navegar }));

const path = (segmento: string) => `${API_PREFIX}${segmento}`;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  navegar.mockReset();
});
afterAll(() => server.close());

function caso(sobrescribe: Record<string, unknown> = {}) {
  return {
    id: 'em-1',
    estado: 'abierta',
    origen: 'cliente',
    version_reclamo: 1,
    reclamo_activo: null,
    activada_en: '2026-11-04T08:00:00Z',
    ...sobrescribe,
  };
}

function detalle(c: Record<string, unknown>) {
  return {
    caso: c,
    viaje: {
      cliente_nombre: 'Cliente de prueba',
      estado: 'EN_TRANSITO',
      origen: 'Origen de prueba',
      destinos: [{ nombre: 'Destino de prueba' }],
      escolta: [],
    },
  };
}

/** Sirve la bandeja, el detalle y las notas de un caso. */
function servirCaso(c: Record<string, unknown>) {
  server.use(
    http.get(path('/panel/emergencias'), () =>
      HttpResponse.json({ items: [c], cursor_siguiente: null }),
    ),
    http.get(path('/panel/emergencias/:eid'), () => HttpResponse.json(detalle(c))),
    http.get(path('/panel/emergencias/:eid/notas'), () =>
      HttpResponse.json({ items: [], cursor_siguiente: null }),
    ),
  );
}

function usuario(rol: string, id = 'sujeto-reaccion') {
  sesion.value = { usuario: { id, rol } };
}

describe('bandeja de Reacción: visibilidad y gestos por rol', () => {
  beforeEach(() => usuario('reaccion'));

  it('muestra los casos y oculta los cerrados aunque el servidor los envíe', async () => {
    server.use(
      http.get(path('/panel/emergencias'), () =>
        HttpResponse.json({
          items: [caso({ id: 'em-1' }), caso({ id: 'em-2', estado: 'cerrada' })],
          cursor_siguiente: null,
        }),
      ),
    );
    render(<BandejaEmergencias />);
    expect(await screen.findByRole('button', { name: /Abierta/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Abierta|Cerrada/ })).toHaveLength(1);
  });

  it('una emergencia abierta sin responsable ofrece Reclamar', async () => {
    servirCaso(caso());
    render(<BandejaEmergencias casoAbierto="em-1" />);
    expect(await screen.findByRole('button', { name: 'Reclamar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolver' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar emergencia' })).not.toBeInTheDocument();
  });

  it('Reclamar envía la version_reclamo del caso (P1)', async () => {
    let cuerpo: unknown;
    servirCaso(caso({ version_reclamo: 5 }));
    server.use(
      http.post(path('/panel/emergencias/:eid/reclamos'), async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ id: 'rc', version: 6 }, { status: 201 });
      }),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Reclamar' }));
    await waitFor(() => expect(cuerpo).toEqual({ version_esperada: 5 }));
  });

  it('un reclamo con versión obsoleta (409) muestra aviso y no reintenta', async () => {
    servirCaso(caso());
    let intentos = 0;
    server.use(
      http.post(path('/panel/emergencias/:eid/reclamos'), () => {
        intentos += 1;
        return HttpResponse.json({ codigo: 'conflicto_version_reclamo' }, { status: 409 });
      }),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Reclamar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El caso cambió');
    expect(intentos).toBe(1);
  });

  it('resolver con responsable envía la versión del reclamo y la nota recortada (P1, P4)', async () => {
    let cuerpo: unknown;
    servirCaso(
      caso({
        estado: 'en_atencion',
        version_reclamo: 3,
        reclamo_activo: {
          id: 'rc-1',
          conversacion_id: 'em-1',
          responsable_id: 'sujeto-reaccion',
          version: 4,
          abierto_en: '2026-11-04T08:01:00Z',
        },
      }),
    );
    server.use(
      http.post(path('/panel/emergencias/:eid/resolucion'), async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ id: 'em-1', estado: 'resuelta' });
      }),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Resolver' }));
    const dialogo = await screen.findByRole('dialog');
    const nota = within(dialogo).getByLabelText(/Nota de resolución/);
    const confirmar = within(dialogo).getByRole('button', { name: 'Resolver' });
    expect(confirmar).toBeDisabled();
    await userEvent.type(nota, '  Unidad liberada  ');
    await userEvent.click(confirmar);
    await waitFor(() => expect(cuerpo).toEqual({ version_esperada: 4, nota: 'Unidad liberada' }));
  });

  it('resolver con 400 conserva la nota escrita', async () => {
    servirCaso(
      caso({
        estado: 'en_atencion',
        reclamo_activo: {
          id: 'rc-1',
          conversacion_id: 'em-1',
          responsable_id: 'sujeto-reaccion',
          version: 4,
          abierto_en: '2026-11-04T08:01:00Z',
        },
      }),
    );
    server.use(
      http.post(path('/panel/emergencias/:eid/resolucion'), () =>
        HttpResponse.json({ codigo: 'solicitud_invalida' }, { status: 400 }),
      ),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Resolver' }));
    const dialogo = await screen.findByRole('dialog');
    await userEvent.type(
      within(dialogo).getByLabelText(/Nota de resolución/),
      'Nota que debe conservarse',
    );
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Resolver' }));
    expect(await within(dialogo).findByText(/No se pudo resolver/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText(/Nota de resolución/)).toHaveValue(
      'Nota que debe conservarse',
    );
  });

  it('no muestra ubicación, viaje_id, cliente_id, actor_real ni enlaces al viaje (P5)', async () => {
    servirCaso(caso());
    const { container } = render(<BandejaEmergencias casoAbierto="em-1" />);
    await screen.findByRole('button', { name: 'Reclamar' });
    const texto = container.textContent ?? '';
    for (const prohibido of ['ubicación', 'Ubicación', 'viaje_id', 'cliente_id', 'actor_real']) {
      expect(texto).not.toContain(prohibido);
    }
    expect(container.querySelectorAll('a[href*="/viajes"]')).toHaveLength(0);
  });

  it('no ofrece transferir ni notas del monitoreo a Reacción', async () => {
    servirCaso(caso({ estado: 'resuelta' }));
    const { container } = render(<BandejaEmergencias casoAbierto="em-1" />);
    await screen.findByText('Viaje');
    expect(container.textContent).not.toMatch(/Transferir/);
    expect(screen.queryByLabelText(/^Nota \(1 a/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar emergencia' })).not.toBeInTheDocument();
  });

  it('403 en la bandeja muestra acceso denegado', async () => {
    server.use(
      http.get(path('/panel/emergencias'), () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
    );
    render(<BandejaEmergencias />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes acceso');
  });
});

describe('bandeja de emergencias: supervisor consulta y cierra', () => {
  beforeEach(() => usuario('supervisor', 'sujeto-supervisor'));

  it('no ofrece reclamar ni resolver, pero sí devolver y cerrar', async () => {
    servirCaso(
      caso({
        estado: 'resuelta',
        reclamo_activo: {
          id: 'rc-1',
          conversacion_id: 'em-1',
          responsable_id: 'otro',
          version: 2,
          abierto_en: '2026-11-04T08:01:00Z',
        },
      }),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    await screen.findByText('Viaje');
    expect(screen.queryByRole('button', { name: 'Reclamar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolver' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Cerrar emergencia' }).length).toBeGreaterThan(0);
  });

  it('cerrar desde la bandeja navega sin el caso en la búsqueda', async () => {
    servirCaso(caso({ estado: 'resuelta' }));
    server.use(
      http.post(path('/panel/emergencias/:eid/cierre'), () =>
        HttpResponse.json({ id: 'em-1', estado: 'cerrada' }),
      ),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar emergencia' }));
    const dialogo = await screen.findByRole('dialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar emergencia' }));
    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: '/emergencias', search: {} }));
  });
});

describe('bandeja de emergencias: vacía, detalle y gestos de devolución', () => {
  it('bandeja vacía muestra el estado vacío', async () => {
    usuario('reaccion');
    server.use(
      http.get(path('/panel/emergencias'), () =>
        HttpResponse.json({ items: [], cursor_siguiente: null }),
      ),
    );
    render(<BandejaEmergencias />);
    expect(await screen.findByText('No hay emergencias activas.')).toBeInTheDocument();
  });

  it('detalle con escolta muestra custodios y teléfono, o aviso si no hay teléfono', async () => {
    usuario('reaccion');
    servirCaso(caso());
    server.use(
      http.get(path('/panel/emergencias/:eid'), () =>
        HttpResponse.json({
          caso: caso(),
          viaje: {
            cliente_nombre: 'Cliente',
            estado: 'EN_TRANSITO',
            origen: 'O',
            destinos: [],
            escolta: [
              {
                tipo: 'patrulla',
                custodios: [{ nombre: 'Ana', telefono: '+52 811 000 0001' }, { nombre: 'Luis' }],
              },
            ],
          },
        }),
      ),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    expect(await screen.findByText(/Ana · \+52 811 000 0001/)).toBeInTheDocument();
    expect(screen.getByText(/Luis · Sin teléfono registrado/)).toBeInTheDocument();
  });

  it('devolver al pool libera con la versión del reclamo activo', async () => {
    usuario('reaccion', 'sujeto-reaccion');
    servirCaso(
      caso({
        estado: 'en_atencion',
        reclamo_activo: {
          id: 'rc-7',
          conversacion_id: 'em-1',
          responsable_id: 'sujeto-reaccion',
          version: 9,
          abierto_en: '2026-11-04T08:01:00Z',
        },
      }),
    );
    let version: string | null = null;
    server.use(
      http.delete(path('/panel/emergencias/:eid/reclamos/:rid'), ({ request }) => {
        version = new URL(request.url).searchParams.get('version_esperada');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Devolver al pool' }));
    const dialogo = await screen.findByRole('dialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Devolver al pool' }));
    await waitFor(() => expect(version).toBe('9'));
  });

  it('resolver como no responsable (403) muestra aviso de acción no permitida', async () => {
    usuario('reaccion', 'sujeto-reaccion');
    servirCaso(
      caso({
        estado: 'en_atencion',
        reclamo_activo: {
          id: 'rc-1',
          conversacion_id: 'em-1',
          responsable_id: 'sujeto-reaccion',
          version: 4,
          abierto_en: '2026-11-04T08:01:00Z',
        },
      }),
    );
    server.use(
      http.post(path('/panel/emergencias/:eid/resolucion'), () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Resolver' }));
    const dialogo = await screen.findByRole('dialog');
    await userEvent.type(within(dialogo).getByLabelText(/Nota de resolución/), 'Nota');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Resolver' }));
    expect(await within(dialogo).findByText(/No se pudo resolver/)).toBeInTheDocument();
    expect(
      await screen.findByText('No puedes realizar esta acción sobre la emergencia.'),
    ).toBeInTheDocument();
  });

  it('cerrar con 409 emergencia_cerrada recarga el caso y no navega', async () => {
    usuario('supervisor', 'sujeto-supervisor');
    servirCaso(caso({ estado: 'resuelta' }));
    server.use(
      http.post(path('/panel/emergencias/:eid/cierre'), () =>
        HttpResponse.json({ codigo: 'emergencia_cerrada' }, { status: 409 }),
      ),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar emergencia' }));
    const dialogo = await screen.findByRole('dialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar emergencia' }));
    expect(await screen.findByText('La emergencia ya está cerrada.')).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });
});

describe('cierre de criterios: destinos, avisos y reintento', () => {
  beforeEach(() => usuario('reaccion', 'sujeto-reaccion'));

  it('muestra fecha de cita y arribo de cada destino (4.2)', async () => {
    const c = caso();
    servirCaso(c);
    server.use(
      http.get(path('/panel/emergencias/:eid'), () =>
        HttpResponse.json({
          caso: c,
          viaje: {
            cliente_nombre: 'Cliente',
            estado: 'EN_TRANSITO',
            origen: 'O',
            destinos: [
              { nombre: 'Saltillo', fecha_cita: '2026-11-04T10:00:00Z', arribo: true },
              { nombre: 'Monterrey' },
            ],
            escolta: [],
          },
        }),
      ),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    expect(await screen.findByText(/Saltillo · Cita/)).toHaveTextContent('Arribó');
    expect(screen.getByText(/Monterrey · Sin fecha de cita/)).toHaveTextContent('Sin arribo');
  });

  it('reclamar con éxito muestra aviso de éxito (11.4)', async () => {
    servirCaso(caso());
    server.use(
      http.post(path('/panel/emergencias/:eid/reclamos'), () =>
        HttpResponse.json({ id: 'rc', version: 2 }, { status: 201 }),
      ),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Reclamar' }));
    expect(await screen.findByText('Caso reclamado. Ya eres su responsable.')).toBeInTheDocument();
  });

  it('un error al cargar el detalle ofrece Reintentar (11.2)', async () => {
    const c = caso();
    let lecturas = 0;
    server.use(
      http.get(path('/panel/emergencias'), () =>
        HttpResponse.json({ items: [c], cursor_siguiente: null }),
      ),
      http.get(path('/panel/emergencias/:eid/notas'), () =>
        HttpResponse.json({ items: [], cursor_siguiente: null }),
      ),
      http.get(path('/panel/emergencias/:eid'), () => {
        lecturas += 1;
        // Primer intento falla; el reintento responde bien.
        if (lecturas === 1) return HttpResponse.json({}, { status: 500 });
        return HttpResponse.json(detalle(c));
      }),
    );
    render(<BandejaEmergencias casoAbierto="em-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: 'Reclamar' })).toBeInTheDocument();
  });
});
