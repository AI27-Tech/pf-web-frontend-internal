import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { SeccionEmergenciasViaje } from '@/features/emergencias/activacion/SeccionEmergenciasViaje';
import { API_PREFIX } from '@/lib/constants';

const sesion = vi.hoisted(() => ({ value: { id: 'sujeto-monitor', rol: 'monitorista' } }));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: { id: sesion.value.id, rol: sesion.value.rol },
  }),
}));

const path = (segmento: string) => `${API_PREFIX}${segmento}`;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  sesion.value = { id: 'sujeto-monitor', rol: 'monitorista' };
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

const VIAJE = 'viaje-1';

function servirCasos(items: Array<{ id: string; estado: string }>) {
  server.use(
    http.get(path(`/panel/viajes/${VIAJE}/emergencias`), () =>
      HttpResponse.json({
        items: items.map((i) => ({ ...i, activada_en: '2026-11-04T09:00:00Z' })),
      }),
    ),
  );
}

function renderSeccion(estadoViaje = 'EN_TRANSITO', onViajeCambio = vi.fn()) {
  render(
    <SeccionEmergenciasViaje
      viajeId={VIAJE}
      estadoViaje={estadoViaje}
      rol={sesion.value.rol as 'monitorista'}
      onViajeCambio={onViajeCambio}
    />,
  );
  return onViajeCambio;
}

async function pulsarActivar() {
  await userEvent.click(screen.getByRole('button', { name: 'Activar emergencia' }));
  const dialogo = await screen.findByRole('dialog');
  await userEvent.click(within(dialogo).getByRole('button', { name: 'Activar' }));
}

describe('carril de emergencias del viaje: visibilidad por rol', () => {
  it('monitorista ve Activar en un viaje no terminal', async () => {
    servirCasos([]);
    renderSeccion('EN_TRANSITO');
    expect(await screen.findByRole('button', { name: 'Activar emergencia' })).toBeInTheDocument();
  });

  it('no ofrece Activar en un viaje terminal', async () => {
    servirCasos([]);
    renderSeccion('CERRADO');
    await screen.findByText('No hay emergencias activas en este viaje.');
    expect(screen.queryByRole('button', { name: 'Activar emergencia' })).not.toBeInTheDocument();
  });

  it('administrador no activa, pero sí anota y cierra', async () => {
    sesion.value = { id: 'sujeto-admin', rol: 'administrador' };
    servirCasos([{ id: 'em-9', estado: 'resuelta' }]);
    renderSeccion();
    await userEvent.click(await screen.findByRole('button', { name: /Resuelta/ }));
    expect(screen.queryByRole('button', { name: 'Activar emergencia' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar emergencia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar nota' })).toBeInTheDocument();
  });

  it('jefe_operativo no ve el carril ni pide la lista (el bff le responde 403)', async () => {
    let pedidas = 0;
    server.use(
      http.get(path(`/panel/viajes/${VIAJE}/emergencias`), () => {
        pedidas += 1;
        return HttpResponse.json({ codigo: 'prohibido', mensaje: 'prohibido' }, { status: 403 });
      }),
    );
    const { container } = render(
      <SeccionEmergenciasViaje
        viajeId={VIAJE}
        estadoViaje="EN_TRANSITO"
        rol="jefe_operativo"
        onViajeCambio={vi.fn()}
      />,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(container).toBeEmptyDOMElement();
    expect(pedidas).toBe(0);
  });

  it('reaccion no ve el carril', async () => {
    sesion.value = { id: 'sujeto-reaccion', rol: 'reaccion' };
    servirCasos([]);
    const { container } = render(
      <SeccionEmergenciasViaje
        viajeId={VIAJE}
        estadoViaje="EN_TRANSITO"
        rol="reaccion"
        onViajeCambio={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('activación: idempotencia del reintento (P3)', () => {
  it('un fallo de red reutiliza el activacion_id; una pulsación nueva genera otro', async () => {
    servirCasos([]);
    const ids: string[] = [];
    let intento = 0;
    server.use(
      http.post(path(`/panel/viajes/${VIAJE}/emergencias`), async ({ request }) => {
        const cuerpo = (await request.json()) as { activacion_id: string };
        ids.push(cuerpo.activacion_id);
        intento += 1;
        if (intento === 1) return HttpResponse.error();
        return HttpResponse.json(
          { id: 'e', estado: 'abierta', activada_en: '2026-11-04T09:00:00Z' },
          { status: 201 },
        );
      }),
    );
    renderSeccion();
    await pulsarActivar();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await pulsarActivar();
    expect(await screen.findByText(/Emergencia activada/)).toBeInTheDocument();
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);

    // Tras una confirmación, la siguiente pulsación genera un id nuevo.
    await pulsarActivar();
    await screen.findAllByText(/Emergencia activada/);
    expect(ids).toHaveLength(3);
    expect(ids[2]).not.toBe(ids[0]);
  });

  it('409 viaje_en_estado_terminal avisa y pide recargar el viaje', async () => {
    servirCasos([]);
    server.use(
      http.post(path(`/panel/viajes/${VIAJE}/emergencias`), () =>
        HttpResponse.json({ codigo: 'viaje_en_estado_terminal' }, { status: 409 }),
      ),
    );
    const onViajeCambio = renderSeccion();
    await pulsarActivar();
    expect(await screen.findByRole('alert')).toHaveTextContent('El viaje ya está cerrado');
    expect(onViajeCambio).toHaveBeenCalled();
  });
});

describe('nota y cierre (escenarios 7, 14 y 18)', () => {
  it('una nota con 409 emergencia_cerrada conserva el texto', async () => {
    servirCasos([{ id: 'em-9', estado: 'abierta' }]);
    server.use(
      http.post(path(`/panel/viajes/${VIAJE}/emergencias/em-9/notas`), () =>
        HttpResponse.json({ codigo: 'emergencia_cerrada' }, { status: 409 }),
      ),
    );
    renderSeccion();
    await userEvent.click(await screen.findByRole('button', { name: /Abierta/ }));
    await userEvent.type(screen.getByLabelText(/Nota \(1 a/), 'Texto que no debe perderse');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar nota' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ya está cerrada');
    expect(screen.getByLabelText(/Nota \(1 a/)).toHaveValue('Texto que no debe perderse');
  });

  it('una nota válida se envía recortada y limpia el texto', async () => {
    servirCasos([{ id: 'em-9', estado: 'abierta' }]);
    let cuerpo: unknown;
    server.use(
      http.post(path(`/panel/viajes/${VIAJE}/emergencias/em-9/notas`), async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(
          {
            id: 'n',
            emergencia_id: 'em-9',
            audiencia_autor: 'Interno',
            cuerpo: 'x',
            creado_en: '',
          },
          { status: 201 },
        );
      }),
    );
    renderSeccion();
    await userEvent.click(await screen.findByRole('button', { name: /Abierta/ }));
    await userEvent.type(screen.getByLabelText(/Nota \(1 a/), '  Llegó la unidad  ');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar nota' }));
    await vi.waitFor(() => expect(cuerpo).toEqual({ cuerpo: 'Llegó la unidad' }));
    expect(await screen.findByLabelText(/Nota \(1 a/)).toHaveValue('');
  });

  it('cerrar solo se ofrece para casos resueltos y envía el cierre', async () => {
    servirCasos([{ id: 'em-9', estado: 'resuelta' }]);
    let cerrado = false;
    server.use(
      http.post(path(`/panel/emergencias/em-9/cierre`), () => {
        cerrado = true;
        return HttpResponse.json({ id: 'em-9', estado: 'cerrada' });
      }),
    );
    renderSeccion();
    await userEvent.click(await screen.findByRole('button', { name: /Resuelta/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar emergencia' }));
    await vi.waitFor(() => expect(cerrado).toBe(true));
  });

  it('los casos cerrada no aparecen en el selector', async () => {
    servirCasos([
      { id: 'em-1', estado: 'abierta' },
      { id: 'em-2', estado: 'cerrada' },
    ]);
    renderSeccion();
    expect(await screen.findByRole('button', { name: /Abierta/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cerrada/ })).not.toBeInTheDocument();
  });
});

describe('activación: reentrega, permisos y validación', () => {
  it('una reentrega con el mismo activacion_id (200) cuenta como éxito', async () => {
    servirCasos([]);
    server.use(
      http.post(path(`/panel/viajes/${VIAJE}/emergencias`), () =>
        HttpResponse.json(
          { id: 'e', estado: 'abierta', activada_en: '2026-11-04T09:00:00Z' },
          { status: 200 },
        ),
      ),
    );
    renderSeccion();
    await pulsarActivar();
    expect(await screen.findByText(/Emergencia activada/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('403 al activar muestra permiso denegado', async () => {
    servirCasos([]);
    server.use(
      http.post(path(`/panel/viajes/${VIAJE}/emergencias`), () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
    );
    renderSeccion();
    await pulsarActivar();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso para activar emergencias en este viaje.',
    );
  });

  it('400 al anotar muestra nota inválida y conserva el texto', async () => {
    servirCasos([{ id: 'em-9', estado: 'abierta' }]);
    server.use(
      http.post(path(`/panel/viajes/${VIAJE}/emergencias/em-9/notas`), () =>
        HttpResponse.json({ codigo: 'solicitud_invalida' }, { status: 400 }),
      ),
    );
    renderSeccion();
    await userEvent.click(await screen.findByRole('button', { name: /Abierta/ }));
    await userEvent.type(screen.getByLabelText(/Nota \(1 a/), 'Texto válido en apariencia');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar nota' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La nota no es válida');
    expect(screen.getByLabelText(/Nota \(1 a/)).toHaveValue('Texto válido en apariencia');
  });
});

describe('permisos de nota y cierre', () => {
  it('nota con 403 muestra acción no permitida', async () => {
    servirCasos([{ id: 'em-9', estado: 'abierta' }]);
    server.use(
      http.post(path(`/panel/viajes/${VIAJE}/emergencias/em-9/notas`), () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
    );
    renderSeccion();
    await userEvent.click(await screen.findByRole('button', { name: /Abierta/ }));
    await userEvent.type(screen.getByLabelText(/Nota \(1 a/), 'Nota');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar nota' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No puedes realizar esta acción sobre la emergencia.',
    );
  });

  it('cerrar con 403 muestra acción no permitida', async () => {
    servirCasos([{ id: 'em-9', estado: 'resuelta' }]);
    server.use(
      http.post(path('/panel/emergencias/em-9/cierre'), () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
    );
    renderSeccion();
    await userEvent.click(await screen.findByRole('button', { name: /Resuelta/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar emergencia' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No puedes realizar esta acción sobre la emergencia.',
    );
  });
});
