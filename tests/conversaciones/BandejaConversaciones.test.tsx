/*
 * Pruebas de integración de la bandeja de conversaciones (E8-T15, tarea 13).
 *
 * Montan `BandejaConversaciones` contra el `bff` simulado (MSW) con la superficie
 * interna de `tracer.33`. Los handlers y el estado en memoria viven en
 * `src/mocks/` y se reinician en cada prueba.
 *
 * - La sesión (`useSession`) y el router (`useSearch`/`useNavigate`) se sustituyen
 *   por dobles mínimos; la conversación abierta se controla con el parámetro de
 *   búsqueda `conversacion`.
 * - El polling se sustituye por un disparador manual (`dispararPolling`): la
 *   cadencia no es parte del contrato y las pruebas no dependen del reloj. El
 *   polling real se prueba en `actualizacion.test.ts`.
 * - "Otra persona" y "el cliente" actúan con las funciones `simular...Mock` del
 *   dataset, que cambian el estado del servidor sin pasar por la UI.
 *
 * Escenarios de la tarea 13: reclamar y responder; reclamo concurrente; perder el
 * reclamo con la conversación abierta (DoD); devolver al pool y reclamar por otro
 * usuario sin perder historia (DoD, sustituye al e2e de transferencia en V1);
 * atendida y su desmarca; 403 en devolver y en atendida; solo lectura; 404 sin
 * bandeja y 403 sin membresía; 401; `stream_resync_required`; falla de polling; y
 * ausencia de los gestos excluidos de V1 (DEC-107, DEC-108, DEC-118, DEC-119).
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { BandejaConversaciones } from '@/features/conversaciones/BandejaConversaciones';
import { TEXTOS_ERROR_CONVERSACIONES } from '@/lib/api/conversacionesTextos';
import { onCut, restablecerCorte } from '@/lib/api/sessionCut';
import { API_PREFIX } from '@/lib/constants';
import {
  CLIENTE_SIN_NOMBRE_DEMO,
  CONVERSACIONES_DEMO_IDS as ID,
  SUJETO_CONVERSACIONES_DEMO as SUJETO,
  cambiarSujetoConversacionesMock,
  compactarVentanaConversacionesMock,
  forzarFalloConversaciones,
  listarMensajesMock,
  reiniciarConversacionesMock,
  simularLiberacionDeOtraPersonaMock,
  simularMensajeDeClienteMock,
  simularReclamoDeOtraPersonaMock,
  simularVencimientoDeVentanaMock,
  solicitudesConversacionesMock,
  type OperacionConversaciones,
} from '@/mocks/data';
import { handlers } from '@/mocks/handlers';

const path = (segment: string) => `${API_PREFIX}${segment}`;
const OTRA_PERSONA = 'usr-demo-2';

/* -------------------------------------------------------------------------- */
/* Dobles de sesión, router y polling                                          */
/* -------------------------------------------------------------------------- */

const entorno = vi.hoisted(() => {
  const polling = new Set<() => unknown>();
  const oyentes = new Set<() => void>();
  let search: { conversacion?: string } = {};
  const usuario = { id: 'usr-demo-1', rol: 'ejecutivo', audiencia: 'interno' };
  return {
    polling,
    // Objeto estable entre renders: `useNombresCliente` depende de la identidad de `sesion`.
    valorSesion: { sesion: { accessToken: 'token-de-prueba', usuario }, usuario } as {
      sesion: { accessToken: string; usuario: { id: string; rol: string; audiencia: string } };
      usuario: { id: string; rol: string; audiencia: string };
    },
    getSearch: () => search,
    setSearch: (siguiente: { conversacion?: string }) => {
      search = siguiente;
      oyentes.forEach((oyente) => oyente());
    },
    suscribir: (oyente: () => void) => {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
  };
});

vi.mock('@/context/SessionContext', () => ({
  useSession: () => entorno.valorSesion,
}));

vi.mock('@tanstack/react-router', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useSearch: () => useSyncExternalStore(entorno.suscribir, entorno.getSearch),
    useNavigate: () => (opciones: { search: { conversacion?: string } }) => {
      entorno.setSearch(opciones.search);
      return Promise.resolve();
    },
  };
});

vi.mock('@/features/conversaciones/actualizacion', () => ({
  crearPolling: (consultar: () => unknown) => ({
    iniciar: () => {
      entorno.polling.add(consultar);
    },
    detener: () => {
      entorno.polling.delete(consultar);
    },
  }),
}));

/** Ejecuta una vuelta de polling de la bandeja y de la conversación abierta. */
async function dispararPolling() {
  await act(async () => {
    await Promise.all([...entorno.polling].map((consultar) => consultar()));
  });
}

function iniciarSesionComo(id: string, rol = 'ejecutivo') {
  const usuario = { id, rol, audiencia: 'interno' };
  entorno.valorSesion = { sesion: { accessToken: 'token-de-prueba', usuario }, usuario };
  cambiarSujetoConversacionesMock(id);
}

/* -------------------------------------------------------------------------- */
/* Servidor y ciclo de vida                                                    */
/* -------------------------------------------------------------------------- */

const server = setupServer(...handlers);
let urlsSolicitadas: string[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  server.events.on('request:start', ({ request }) => {
    urlsSolicitadas.push(`${request.method} ${new URL(request.url).pathname}`);
  });
});

beforeEach(() => {
  reiniciarConversacionesMock();
  iniciarSesionComo(SUJETO);
  restablecerCorte();
  entorno.polling.clear();
  entorno.setSearch({});
  urlsSolicitadas = [];
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => server.close());

/* -------------------------------------------------------------------------- */
/* Ayudas de consulta                                                          */
/* -------------------------------------------------------------------------- */

function renderBandeja(conversacion?: string) {
  entorno.setSearch(conversacion ? { conversacion } : {});
  return render(<BandejaConversaciones />);
}

function seccion(indice: 0 | 1): HTMLElement {
  const encontrada = document.querySelectorAll('section')[indice];
  if (!encontrada) throw new Error(`No hay sección ${indice} en la bandeja`);
  return encontrada;
}
const lista = () => seccion(0);
const panel = () => seccion(1);

/** Filas de la bandeja (las que llevan `aria-pressed`). */
const filas = () =>
  within(lista())
    .queryAllByRole('button')
    .filter((boton) => boton.hasAttribute('aria-pressed'));

const composer = () => within(panel()).getByLabelText('Mensaje') as HTMLTextAreaElement;
const botonDelPanel = (nombre: string | RegExp) =>
  within(panel()).getByRole('button', { name: nombre });
const esperarBotonDelPanel = (nombre: string | RegExp) =>
  within(panel()).findByRole('button', { name: nombre });
const sinBotonDelPanel = (nombre: string | RegExp) =>
  within(panel()).queryByRole('button', { name: nombre });

async function esperarListaCargada() {
  await waitFor(() => expect(filas()).toHaveLength(5));
}

function solicitudes(operacion: OperacionConversaciones) {
  return solicitudesConversacionesMock().filter((s) => s.operacion === operacion);
}

const TEXTO_ERROR = TEXTOS_ERROR_CONVERSACIONES;

const TEXTO_BANNER = {
  pool: 'La conversación está en el pool.',
  otro: 'La conversación está reclamada por otra persona.',
  soloLectura: 'La conversación está en solo lectura.',
  desactualizada: 'La vista puede estar desactualizada.',
} as const;

/* -------------------------------------------------------------------------- */
/* Bandeja de trabajo                                                          */
/* -------------------------------------------------------------------------- */

describe('Bandeja de trabajo (Requirement 1)', () => {
  it('muestra cliente, estado de reclamo y atendida; resuelve nombres sin exponer ids', async () => {
    renderBandeja();
    await esperarListaCargada();
    await waitFor(() => expect(filas()[0]).toHaveTextContent('Cliente Norte'));

    const texto = filas().map((fila) => fila.textContent ?? '');
    expect(texto[0]).toContain('En el pool');
    expect(texto[1]).toContain('Cliente Centro');
    expect(texto[1]).toContain('Tuya');
    expect(texto[2]).toContain('Cliente Sur');
    expect(texto[2]).toContain('Otra persona');
    expect(texto[3]).toContain('Tuya');
    expect(texto[3]).toContain('Atendida');
    // Cliente que no aparece en `listarClientes`: texto neutro, nunca el id crudo.
    expect(texto[4]).toContain('Cliente no disponible');
    expect(lista()).not.toHaveTextContent(CLIENTE_SIN_NOMBRE_DEMO);
    expect(lista()).not.toHaveTextContent('CLI-1001');
    // La primera carga no envía identificador de bandeja ni `desde_revision`.
    expect(solicitudes('bandeja')[0]?.query).toEqual({});
  });

  it('pagina por cursor sin confundirlo con la revisión', async () => {
    const usuario = userEvent.setup();
    renderBandeja();
    await esperarListaCargada();

    await usuario.click(within(lista()).getByRole('button', { name: 'Cargar más' }));
    await waitFor(() => expect(filas()).toHaveLength(6));
    expect(within(lista()).queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();

    const paginacion = solicitudes('bandeja').at(-1);
    expect(paginacion?.query).toEqual({ cursor: '5' });

    // El catch-up usa la `revision` guardada, no el cursor de paginación.
    await dispararPolling();
    expect(solicitudes('bandejaCatchUp').at(-1)?.query).toEqual({ desde_revision: '6' });
  });

  it('muestra el estado vacío diferenciado de carga y de error', async () => {
    server.use(
      http.get(path('/bandeja/trabajo'), () =>
        HttpResponse.json({ items: [], revision: 1, cursor_siguiente: null }),
      ),
    );
    renderBandeja();
    expect(within(lista()).getByText('Cargando conversaciones...')).toBeInTheDocument();
    expect(
      await within(lista()).findByText('La bandeja no tiene conversaciones.'),
    ).toBeInTheDocument();
    expect(within(lista()).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('un error recuperable ofrece reintento', async () => {
    const usuario = userEvent.setup();
    forzarFalloConversaciones('bandeja', { tipo: 'http', status: 503, codigo: 'no_disponible' });
    renderBandeja();

    expect(await within(lista()).findByRole('alert')).toBeInTheDocument();
    await usuario.click(within(lista()).getByRole('button', { name: 'Reintentar' }));
    await esperarListaCargada();
  });

  it('404 sin bandeja: aviso y ninguna conversación', async () => {
    forzarFalloConversaciones('bandeja', { tipo: 'http', status: 404, codigo: 'no_encontrado' });
    renderBandeja();

    expect(await within(lista()).findByText('No tienes una bandeja asignada.')).toBeInTheDocument();
    expect(filas()).toHaveLength(0);
  });

  it('403 sin membresía efectiva: aviso de acceso no autorizado y ninguna conversación', async () => {
    forzarFalloConversaciones('bandeja', { tipo: 'http', status: 403, codigo: 'prohibido' });
    renderBandeja();

    expect(
      await within(lista()).findByText('No tienes autorización para esta bandeja.'),
    ).toBeInTheDocument();
    expect(filas()).toHaveLength(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Reclamar y responder                                                        */
/* -------------------------------------------------------------------------- */

describe('Reclamar y responder (Requirements 3 y 4)', () => {
  it('Escenario 1: reclama del pool con la versión vigente y su respuesta aparece una sola vez', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.pool);

    const reclamar = await esperarBotonDelPanel('Reclamar');
    // Sin reclamo, el compositor está deshabilitado y la razón es visible.
    expect(composer()).toBeDisabled();
    expect(within(panel()).getByText(TEXTO_BANNER.pool)).toBeInTheDocument();

    await usuario.click(reclamar);
    await esperarBotonDelPanel('Devolver al pool');
    expect(composer()).toBeEnabled();
    // La versión que viaja es la que trajo la conversación (2), nunca un 0 fijo.
    expect(solicitudes('reclamar')).toHaveLength(1);
    expect(solicitudes('reclamar')[0]?.cuerpo).toEqual({ version_esperada: 2 });

    await usuario.type(composer(), 'Confirmo salida a las 18:00');
    await usuario.click(botonDelPanel('Enviar mensaje'));

    await waitFor(() =>
      expect(within(panel()).getAllByText('Confirmo salida a las 18:00')).toHaveLength(1),
    );
    expect(composer()).toHaveValue('');
    const envio = solicitudes('enviar');
    expect(envio).toHaveLength(1);
    expect(envio[0]?.cuerpo).toEqual({
      client_message_id: expect.any(String),
      cuerpo: 'Confirmo salida a las 18:00',
      version_reclamo_esperada: 3,
    });
    // Responder no marca atendida (DEC-117).
    expect(within(panel()).queryByText('Atendida')).not.toBeInTheDocument();
  });

  it('Escenario 7: reclamo concurrente con 409 avisa, recarga y no queda como reclamante', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.pool);
    const reclamar = await esperarBotonDelPanel('Reclamar');

    // Otra persona reclamó un instante antes: la versión que tiene la UI quedó vieja.
    simularReclamoDeOtraPersonaMock(ID.pool);
    await usuario.click(reclamar);

    expect(
      await within(panel()).findByText('La conversación cambió. Recarga para continuar.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(within(panel()).getByText(TEXTO_BANNER.otro)).toBeInTheDocument());
    expect(sinBotonDelPanel('Reclamar')).not.toBeInTheDocument();
    expect(sinBotonDelPanel('Devolver al pool')).not.toBeInTheDocument();
    expect(composer()).toBeDisabled();
    // No hay reintento ni reasignación en silencio.
    expect(solicitudes('reclamar')).toHaveLength(1);
  });

  it('Escenario 9: responder sin reclamo vigente no presenta el mensaje como enviado', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');
    await usuario.type(composer(), 'Respuesta que no debe enviarse');

    // Otra persona se llevó el reclamo mientras escribía; la UI aún no lo sabe.
    simularReclamoDeOtraPersonaMock(ID.mia);
    await usuario.click(botonDelPanel('Enviar mensaje'));

    // 403 al enviar: autorización insuficiente en español, no la cadena técnica del cliente HTTP.
    expect(await within(panel()).findByRole('alert')).toHaveTextContent(
      TEXTO_ERROR.autorizacionInsuficiente,
    );
    expect(within(panel()).getByRole('alert')).not.toHaveTextContent('→');
    await waitFor(() => expect(composer()).toBeDisabled());
    expect(composer()).toHaveValue('Respuesta que no debe enviarse');
    expect(within(panel()).getByText(TEXTO_BANNER.otro)).toBeInTheDocument();
    // El texto aparece solo en el borrador, no en el historial.
    expect(
      within(panel())
        .queryAllByText('Respuesta que no debe enviarse')
        .filter((elemento) => elemento.tagName !== 'TEXTAREA'),
    ).toHaveLength(0);
  });

  it('Escenario 10: el reintento tras una falla de red reutiliza el client_message_id', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');

    forzarFalloConversaciones('enviar', { tipo: 'red' });
    await usuario.type(composer(), 'Mensaje con reintento');
    await usuario.click(botonDelPanel('Enviar mensaje'));
    // Una caída de red es un error recuperable con texto claro, no "Fallo de red al llamar a …".
    expect(await within(panel()).findByRole('alert')).toHaveTextContent(
      TEXTO_ERROR.servicioNoDisponible,
    );
    // La falla de red conserva el borrador.
    expect(composer()).toHaveValue('Mensaje con reintento');

    await usuario.click(botonDelPanel('Enviar mensaje'));
    await waitFor(() =>
      expect(within(panel()).getAllByText('Mensaje con reintento')).toHaveLength(1),
    );
    const [primero, segundo] = solicitudes('enviar');
    expect(solicitudes('enviar')).toHaveLength(2);
    expect(segundo?.cuerpo?.client_message_id).toBe(primero?.cuerpo?.client_message_id);
  });
});

/* -------------------------------------------------------------------------- */
/* Perder el reclamo (definición de terminado)                                  */
/* -------------------------------------------------------------------------- */

describe('Perder el reclamo quita el envío, no la lectura (Requirement 5)', () => {
  it('Escenario 8: con la conversación abierta y un borrador, otra persona reclama y el polling lo refleja', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');
    await esperarListaCargada();
    expect(composer()).toBeEnabled();
    await usuario.type(composer(), 'Borrador sin enviar');
    const mensajesAntes = within(panel()).getByText('El ETA estimado es 18:30.');
    expect(mensajesAntes).toBeInTheDocument();

    // Otra persona reclama y el cliente escribe mientras la conversación sigue abierta.
    simularReclamoDeOtraPersonaMock(ID.mia);
    simularMensajeDeClienteMock(ID.mia, 'Mensaje nuevo mientras tanto');
    await dispararPolling();

    // El compositor se deshabilita con la razón visible.
    await waitFor(() => expect(composer()).toBeDisabled());
    expect(within(panel()).getByText(TEXTO_BANNER.otro)).toBeInTheDocument();
    expect(sinBotonDelPanel('Devolver al pool')).not.toBeInTheDocument();
    expect(sinBotonDelPanel('Marcar atendida')).not.toBeInTheDocument();
    // El historial completo sigue visible e incorpora el mensaje nuevo.
    expect(within(panel()).getByText('¿Cuál es el ETA de la unidad?')).toBeInTheDocument();
    expect(within(panel()).getByText('El ETA estimado es 18:30.')).toBeInTheDocument();
    expect(within(panel()).getByText('Gracias, ¿pueden confirmar la parada?')).toBeInTheDocument();
    expect(await within(panel()).findByText('Mensaje nuevo mientras tanto')).toBeInTheDocument();
    // El borrador se conserva y nunca se envió.
    expect(composer()).toHaveValue('Borrador sin enviar');
    expect(solicitudes('enviar')).toHaveLength(0);
    // La bandeja también lo muestra: de dos filas "Tuya" queda una.
    await waitFor(() =>
      expect(filas().filter((fila) => fila.textContent?.includes('Tuya'))).toHaveLength(1),
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Devolver al pool (sustituye al e2e de transferencia en V1)                   */
/* -------------------------------------------------------------------------- */

describe('Devolver al pool (Requirements 6 y 7)', () => {
  it('Escenario 2: devuelve al pool conservando el historial y otro usuario la reclama sin pérdida', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');

    await usuario.click(botonDelPanel('Devolver al pool'));

    // Vuelve al pool: compositor deshabilitado, historial intacto.
    expect(await esperarBotonDelPanel('Reclamar')).toBeInTheDocument();
    await waitFor(() => expect(within(panel()).getByText(TEXTO_BANNER.pool)).toBeInTheDocument());
    expect(composer()).toBeDisabled();
    expect(within(panel()).getByText('¿Cuál es el ETA de la unidad?')).toBeInTheDocument();
    expect(within(panel()).getByText('El ETA estimado es 18:30.')).toBeInTheDocument();
    // Liberar usa la versión vigente (3) y sube la versión monótona a 4.
    const liberar = solicitudes('liberar');
    expect(liberar).toHaveLength(1);
    expect(liberar[0]?.query).toEqual({ version_esperada: '3' });

    // Segunda persona del pool (otra sesión) reclama y lee el historial completo.
    cleanup();
    iniciarSesionComo(OTRA_PERSONA);
    entorno.polling.clear();
    renderBandeja(ID.mia);

    await usuario.click(await esperarBotonDelPanel('Reclamar'));
    await esperarBotonDelPanel('Devolver al pool');
    expect(solicitudes('reclamar').at(-1)?.cuerpo).toEqual({ version_esperada: 4 });
    expect(composer()).toBeEnabled();
    // Historia previa íntegra, incluida la respuesta del primer usuario.
    expect(within(panel()).getByText('¿Cuál es el ETA de la unidad?')).toBeInTheDocument();
    expect(within(panel()).getByText('El ETA estimado es 18:30.')).toBeInTheDocument();
    expect(within(panel()).getByText('Gracias, ¿pueden confirmar la parada?')).toBeInTheDocument();

    await usuario.type(composer(), 'Continúo yo la atención');
    await usuario.click(botonDelPanel('Enviar mensaje'));
    await waitFor(() =>
      expect(within(panel()).getAllByText('Continúo yo la atención')).toHaveLength(1),
    );
    // Y el primer usuario, al volver, ya no puede responder y ve la nueva respuesta.
    cleanup();
    iniciarSesionComo(SUJETO);
    entorno.polling.clear();
    renderBandeja(ID.mia);
    expect(await within(panel()).findByText('Continúo yo la atención')).toBeInTheDocument();
    expect(within(panel()).getByText(TEXTO_BANNER.otro)).toBeInTheDocument();
    expect(composer()).toBeDisabled();
  });

  it('pide confirmación antes de devolver si hay un borrador sin enviar', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');
    await usuario.type(composer(), 'Texto a medias');

    await usuario.click(botonDelPanel('Devolver al pool'));
    const dialogo = await screen.findByRole('dialog');
    expect(solicitudes('liberar')).toHaveLength(0);

    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(solicitudes('liberar')).toHaveLength(0);

    await usuario.click(botonDelPanel('Devolver al pool'));
    await usuario.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Devolver al pool' }),
    );
    await esperarBotonDelPanel('Reclamar');
    expect(solicitudes('liberar')).toHaveLength(1);
  });

  it('409 al devolver informa que el reclamo cambió y recarga sin presentarla como devuelta', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');

    forzarFalloConversaciones('liberar', {
      tipo: 'http',
      status: 409,
      codigo: 'conflicto_version_reclamo',
    });
    await usuario.click(botonDelPanel('Devolver al pool'));

    expect(
      await within(panel()).findByText('La conversación cambió. Recarga para continuar.'),
    ).toBeInTheDocument();
    // Tras recargar, el servidor aún la tiene reclamada por el usuario: no está en el pool.
    await esperarBotonDelPanel('Devolver al pool');
    expect(within(panel()).queryByText(TEXTO_BANNER.pool)).not.toBeInTheDocument();
  });

  it('Escenario 15: 403 al devolver informa que solo el responsable puede y recarga', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');

    simularReclamoDeOtraPersonaMock(ID.mia);
    await usuario.click(botonDelPanel('Devolver al pool'));

    expect(
      await within(panel()).findByText('Solo el responsable activo puede ejecutar esta acción.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(within(panel()).getByText(TEXTO_BANNER.otro)).toBeInTheDocument());
    expect(sinBotonDelPanel('Devolver al pool')).not.toBeInTheDocument();
    expect(composer()).toBeDisabled();
  });
});

/* -------------------------------------------------------------------------- */
/* Marcar atendida                                                             */
/* -------------------------------------------------------------------------- */

describe('Marcar atendida (Requirement 8)', () => {
  it('Escenarios 3 y 5: la marca es explícita, responder no la pone y un mensaje del cliente la quita', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Marcar atendida');
    await esperarListaCargada();

    // Responder no la marca (DEC-117).
    await usuario.type(composer(), 'Parada confirmada en Querétaro');
    await usuario.click(botonDelPanel('Enviar mensaje'));
    await within(panel()).findAllByText('Parada confirmada en Querétaro');
    expect(within(panel()).queryByText('Atendida')).not.toBeInTheDocument();

    // La acción explícita usa la versión vigente y se refleja con `atendida_en` recargado.
    await usuario.click(botonDelPanel('Marcar atendida'));
    expect(await within(panel()).findByText('Atendida')).toBeInTheDocument();
    expect(sinBotonDelPanel('Marcar atendida')).not.toBeInTheDocument();
    expect(solicitudes('atendida')[0]?.cuerpo).toEqual({ version_esperada: 3 });

    // El cliente vuelve a escribir: el siguiente polling trae `atendida_en` vacío (DEC-122).
    simularMensajeDeClienteMock(ID.mia, 'Una duda más, por favor');
    await dispararPolling();

    expect(await within(panel()).findByText('Una duda más, por favor')).toBeInTheDocument();
    await waitFor(() => expect(within(panel()).queryByText('Atendida')).not.toBeInTheDocument());
    expect(botonDelPanel('Marcar atendida')).toBeInTheDocument();
    // Y no se rotula como "pendiente" ni como alerta (DEC-108).
    expect(within(panel()).queryByText(/pendiente/i)).not.toBeInTheDocument();
  });

  it('403 al marcar atendida informa que solo el responsable puede y recarga', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Marcar atendida');

    simularReclamoDeOtraPersonaMock(ID.mia);
    await usuario.click(botonDelPanel('Marcar atendida'));

    expect(
      await within(panel()).findByText('Solo el responsable activo puede ejecutar esta acción.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(within(panel()).getByText(TEXTO_BANNER.otro)).toBeInTheDocument());
    expect(within(panel()).queryByText('Atendida')).not.toBeInTheDocument();
  });

  it('409 al marcar atendida sin reclamo activo informa que la conversación cambió y recarga', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Marcar atendida');

    simularLiberacionDeOtraPersonaMock(ID.mia);
    await usuario.click(botonDelPanel('Marcar atendida'));

    expect(
      await within(panel()).findByText('La conversación cambió. Recarga para continuar.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(within(panel()).getByText(TEXTO_BANNER.pool)).toBeInTheDocument());
    expect(within(panel()).queryByText('Atendida')).not.toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/* Historial y solo lectura                                                    */
/* -------------------------------------------------------------------------- */

describe('Historial y solo lectura (Requirements 2 y 10)', () => {
  it('Escenario 4: sin reclamo se lee el historial completo, ordenado por secuencia, con la razón visible', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.historialLargo);

    // Primera página: las 5 más recientes, y la opción de cargar hacia atrás.
    await within(panel()).findByText('Mensaje 44 del historial.');
    expect(composer()).toBeDisabled();
    expect(within(panel()).getByText(TEXTO_BANNER.pool)).toBeInTheDocument();
    expect(within(panel()).queryByText('Mensaje 9 del historial.')).not.toBeInTheDocument();

    await usuario.click(botonDelPanel('Cargar mensajes anteriores'));
    await within(panel()).findByText('Mensaje 2 del historial.');
    expect(solicitudes('listarMensajes').at(-1)?.query).toEqual({ antes_de: '14' });
    // Orden canónico por secuencia, sin duplicados.
    const orden = within(panel())
      .getAllByText(/Mensaje \d+ del historial\./)
      .map((elemento) => elemento.textContent);
    expect(orden).toEqual([2, 5, 9, 14, 20, 27, 35, 44].map((n) => `Mensaje ${n} del historial.`));
    expect(sinBotonDelPanel('Cargar mensajes anteriores')).not.toBeInTheDocument();
  });

  it('una conversación en solo lectura deshabilita el compositor y no ofrece acciones de reclamo', async () => {
    renderBandeja(ID.soloLectura);

    expect(await within(panel()).findByText('Servicio concluido.')).toBeInTheDocument();
    expect(within(panel()).getByText(TEXTO_BANNER.soloLectura)).toBeInTheDocument();
    expect(composer()).toBeDisabled();
    expect(sinBotonDelPanel('Reclamar')).not.toBeInTheDocument();
    expect(sinBotonDelPanel('Devolver al pool')).not.toBeInTheDocument();
    expect(sinBotonDelPanel('Marcar atendida')).not.toBeInTheDocument();
  });

  it('Escenario 11: conversacion_solo_lectura al enviar deshabilita el compositor y conserva el texto', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');
    await usuario.type(composer(), 'Llegué tarde a responder');

    // La ventana venció mientras la UI aún tenía la conversación como escribible.
    simularVencimientoDeVentanaMock(ID.mia);
    await usuario.click(botonDelPanel('Enviar mensaje'));

    expect(
      await within(panel()).findByText('La ventana de escritura terminó.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(composer()).toBeDisabled());
    expect(within(panel()).getByText(TEXTO_BANNER.soloLectura)).toBeInTheDocument();
    expect(composer()).toHaveValue('Llegué tarde a responder');
    expect(within(panel()).getByText('El ETA estimado es 18:30.')).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/* Sesión, resincronización y polling                                           */
/* -------------------------------------------------------------------------- */

describe('Sesión, resincronización y polling (Requirements 11 y 12)', () => {
  it('Escenario 14: 401 en la bandeja se delega al flujo de sesión (corte único)', async () => {
    const alCortar = vi.fn();
    const quitar = onCut(alCortar);
    forzarFalloConversaciones('bandeja', { tipo: 'http', status: 401 }, Infinity);
    renderBandeja();

    await waitFor(() => expect(alCortar).toHaveBeenCalledWith('sesion_finalizada'));
    expect(alCortar).toHaveBeenCalledTimes(1);
    expect(filas()).toHaveLength(0);
    quitar();
  });

  it('Escenario 14: 401 en una acción también corta la sesión', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.pool);
    const reclamar = await esperarBotonDelPanel('Reclamar');
    const alCortar = vi.fn();
    const quitar = onCut(alCortar);

    forzarFalloConversaciones('reclamar', { tipo: 'http', status: 401 });
    await usuario.click(reclamar);

    await waitFor(() => expect(alCortar).toHaveBeenCalledWith('sesion_finalizada'));
    quitar();
  });

  it('Escenario 6: stream_resync_required repite el bootstrap sin huecos ni duplicados', async () => {
    renderBandeja();
    await esperarListaCargada();

    // Hay un cambio y la ventana de catch-up se descarta: el catch-up ya no es posible.
    simularReclamoDeOtraPersonaMock(ID.pool);
    compactarVentanaConversacionesMock();
    await dispararPolling();

    await waitFor(() =>
      expect(solicitudes('bandeja').length + solicitudes('bandejaCatchUp').length).toBe(3),
    );
    expect(
      solicitudesConversacionesMock()
        .map((s) => s.operacion)
        .filter((operacion) => operacion === 'bandeja' || operacion === 'bandejaCatchUp'),
    ).toEqual(['bandeja', 'bandejaCatchUp', 'bandeja']);
    // Tras el nuevo bootstrap la lista refleja el cambio, con cada conversación una vez.
    await waitFor(() => expect(filas()).toHaveLength(5));
    await waitFor(() => expect(filas()[0]).toHaveTextContent('Otra persona'));
    // La siguiente vuelta de polling ya usa la nueva revisión y no vuelve a resincronizar.
    await dispararPolling();
    expect(solicitudes('bandejaCatchUp').at(-1)?.query).toEqual({ desde_revision: '8' });
    expect(solicitudes('bandeja')).toHaveLength(2);
  });

  it('Escenario 12: una falla de polling conserva los datos, avisa que puede estar desactualizada y reintenta', async () => {
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');
    await esperarListaCargada();

    forzarFalloConversaciones('bandejaCatchUp', { tipo: 'red' });
    forzarFalloConversaciones('listarMensajes', {
      tipo: 'http',
      status: 503,
      codigo: 'no_disponible',
    });
    await dispararPolling();

    expect(await within(panel()).findByText(TEXTO_BANNER.desactualizada)).toBeInTheDocument();
    // Con el panel abierto el aviso no se duplica en la lista.
    expect(screen.getAllByText(TEXTO_BANNER.desactualizada)).toHaveLength(1);
    expect(within(lista()).queryByText(TEXTO_BANNER.desactualizada)).not.toBeInTheDocument();
    // Los datos ya mostrados se conservan.
    expect(filas()).toHaveLength(5);
    expect(within(panel()).getByText('El ETA estimado es 18:30.')).toBeInTheDocument();
    expect(within(panel()).getByText(/Actualizado:/)).toBeInTheDocument();

    // El siguiente intento (sin fallo forzado) recupera la vista.
    await dispararPolling();
    await waitFor(() =>
      expect(within(panel()).queryByText(TEXTO_BANNER.desactualizada)).not.toBeInTheDocument(),
    );
  });

  it('con solo la lista abierta, una falla de polling conserva las filas y muestra un aviso', async () => {
    renderBandeja();
    await esperarListaCargada();

    forzarFalloConversaciones('bandejaCatchUp', {
      tipo: 'http',
      status: 503,
      codigo: 'no_disponible',
    });
    await dispararPolling();

    expect(await within(lista()).findByRole('alert')).toHaveTextContent(
      TEXTO_ERROR.servicioNoDisponible,
    );
    // Req 11.5: la desactualización se avisa también a nivel de lista, con la hora de la última actualización.
    expect(await within(lista()).findByText(TEXTO_BANNER.desactualizada)).toBeInTheDocument();
    expect(within(lista()).getByText(/Actualizado:/)).toBeInTheDocument();
    expect(filas()).toHaveLength(5);

    // El siguiente intento (sin fallo forzado) recupera la vista y retira el aviso.
    await dispararPolling();
    await waitFor(() =>
      expect(within(lista()).queryByText(TEXTO_BANNER.desactualizada)).not.toBeInTheDocument(),
    );
  });

  it('las acciones HTTP siguen operando aunque falle el polling', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Marcar atendida');
    forzarFalloConversaciones('bandejaCatchUp', { tipo: 'red' }, Infinity);
    await dispararPolling();

    await usuario.click(botonDelPanel('Marcar atendida'));
    expect(await within(panel()).findByText('Atendida')).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/* Gestos excluidos de V1                                                      */
/* -------------------------------------------------------------------------- */

describe('Ausencia de gestos excluidos de V1 (Requirements 7 y 9)', () => {
  it('un Supervisor ante una conversación ajena no ve override, liberar, atender, transferir ni compositor', async () => {
    iniciarSesionComo(SUJETO, 'supervisor');
    renderBandeja(ID.deOtro);
    await within(panel()).findByText('Lo estamos revisando.');
    await esperarListaCargada();
    await waitFor(() => expect(filas()[2]).toHaveTextContent('Cliente Sur'));

    const botones = within(panel())
      .queryAllByRole('button')
      .map((boton) => boton.getAttribute('aria-label') ?? boton.textContent ?? '');
    for (const prohibido of [
      /override/i,
      /forzar/i,
      /transferi/i,
      /devolver/i,
      /liberar/i,
      /atendid/i,
      /reclamar/i,
      /asignar/i,
    ]) {
      expect(botones.filter((nombre) => prohibido.test(nombre))).toEqual([]);
    }
    expect(composer()).toBeDisabled();
    expect(within(panel()).getByText(TEXTO_BANNER.otro)).toBeInTheDocument();

    // Sin selector de destino ni nombres de Ejecutivos.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.querySelector('select')).toBeNull();
    expect(document.body).not.toHaveTextContent(/responsable_destino|motivo_override|transferir/i);
    expect(document.body).not.toHaveTextContent(new RegExp(OTRA_PERSONA));
    // Sin alerta de mensaje pendiente ni conteo de no leídos.
    expect(document.body).not.toHaveTextContent(/pendiente|no le[ií]dos?|sin leer/i);
  });

  it('la fila no lleva vista previa del último mensaje ni conteo de no leídos', async () => {
    renderBandeja();
    await esperarListaCargada();
    await waitFor(() => expect(filas()[0]).toHaveTextContent('Cliente Norte'));

    const cuerpos = Object.values(ID).flatMap((id) =>
      (listarMensajesMock(id, { limite: 100 })?.items ?? []).map((mensaje) => mensaje.cuerpo),
    );
    for (const fila of filas()) {
      for (const cuerpo of cuerpos) expect(fila.textContent).not.toContain(cuerpo);
      expect(fila.textContent).not.toMatch(/\b\d+\s+(nuevos?|sin leer|no le[ií]dos?)\b/i);
    }
    expect(lista()).not.toHaveTextContent(/no le[ií]dos?|sin leer|pendiente/i);
  });

  it('ningún envío incluye motivo_override y no se invoca la transferencia dirigida', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.pool);

    await usuario.click(await esperarBotonDelPanel('Reclamar'));
    await esperarBotonDelPanel('Devolver al pool');
    await usuario.type(composer(), 'Atención en curso');
    await usuario.click(botonDelPanel('Enviar mensaje'));
    await within(panel()).findAllByText('Atención en curso');
    await usuario.click(botonDelPanel('Marcar atendida'));
    await within(panel()).findByText('Atendida');
    await usuario.click(botonDelPanel('Devolver al pool'));
    await esperarBotonDelPanel('Reclamar');

    for (const envio of solicitudes('enviar')) {
      expect(envio.cuerpo).not.toHaveProperty('motivo_override');
      expect(Object.keys(envio.cuerpo ?? {}).sort()).toEqual([
        'client_message_id',
        'cuerpo',
        'version_reclamo_esperada',
      ]);
    }
    // Devolver al pool es liberarReclamo (DELETE), no una transferencia.
    expect(urlsSolicitadas.filter((url) => /transferencias|override/.test(url))).toEqual([]);
    expect(
      urlsSolicitadas.some((url) => url.startsWith('DELETE ') && url.includes('/reclamos/')),
    ).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Textos de error al usuario (Req 2.7, 4.6, 9.6, 12.2)                         */
/* -------------------------------------------------------------------------- */

describe('Textos de error claros en español', () => {
  const CADENA_TECNICA = /→|\b(GET|POST|DELETE)\b|Fallo de red/;

  it('403 al reclamar: autorización insuficiente', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.pool);
    const reclamar = await esperarBotonDelPanel('Reclamar');
    forzarFalloConversaciones('reclamar', { tipo: 'http', status: 403, codigo: 'prohibido' });
    await usuario.click(reclamar);

    const alerta = await within(panel()).findByRole('alert');
    expect(alerta).toHaveTextContent(TEXTO_ERROR.autorizacionInsuficiente);
    expect(alerta.textContent).not.toMatch(CADENA_TECNICA);
  });

  it('5xx al enviar: error recuperable que conserva el borrador', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');
    forzarFalloConversaciones('enviar', { tipo: 'http', status: 503, codigo: 'no_disponible' });
    await usuario.type(composer(), 'Mensaje que falla');
    await usuario.click(botonDelPanel('Enviar mensaje'));

    const alerta = await within(panel()).findByRole('alert');
    expect(alerta).toHaveTextContent(TEXTO_ERROR.servicioNoDisponible);
    expect(alerta.textContent).not.toMatch(CADENA_TECNICA);
    expect(composer()).toHaveValue('Mensaje que falla');
  });

  it('404 al abrir una conversación: "no disponible" sin distinguir la causa y sin reintento', async () => {
    renderBandeja('CNV-404');
    const alerta = await within(panel()).findByRole('alert');
    expect(alerta).toHaveTextContent(TEXTO_ERROR.conversacionNoDisponible);
    expect(alerta.textContent).not.toMatch(CADENA_TECNICA);
    expect(within(panel()).queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('5xx al abrir una conversación: error recuperable con reintento que carga la conversación', async () => {
    const usuario = userEvent.setup();
    forzarFalloConversaciones('obtener', { tipo: 'http', status: 500 });
    renderBandeja(ID.mia);

    const alerta = await within(panel()).findByRole('alert');
    expect(alerta).toHaveTextContent(TEXTO_ERROR.servicioNoDisponible);
    expect(alerta.textContent).not.toMatch(CADENA_TECNICA);

    await usuario.click(within(panel()).getByRole('button', { name: 'Reintentar' }));
    await esperarBotonDelPanel('Devolver al pool');
    expect(within(panel()).getByText('El ETA estimado es 18:30.')).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/* Versión vigente e identificador de mensaje (Propiedades 5 y 6)                */
/* -------------------------------------------------------------------------- */

describe('Versión vigente y client_message_id', () => {
  it('devolver al pool envía el version_reclamo vigente de la conversación, no un 0 fijo', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await usuario.click(await esperarBotonDelPanel('Devolver al pool'));
    await within(panel()).findByText(TEXTO_BANNER.pool);

    expect(solicitudes('liberar')).toHaveLength(1);
    expect(solicitudes('liberar')[0]?.query).toEqual({ version_esperada: '3' });
  });

  it('tras un 409, la siguiente acción usa la versión recargada y no la vieja', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.pool);
    const reclamar = await esperarBotonDelPanel('Reclamar');

    // Otra persona reclama (versión 3) y luego libera (versión 4); la UI aún tiene la 2.
    simularReclamoDeOtraPersonaMock(ID.pool);
    await usuario.click(reclamar);
    await within(panel()).findByText(TEXTO_BANNER.otro);
    simularLiberacionDeOtraPersonaMock(ID.pool);
    await dispararPolling();
    await usuario.click(await esperarBotonDelPanel('Reclamar'));

    await esperarBotonDelPanel('Devolver al pool');
    const reclamos = solicitudes('reclamar');
    expect(reclamos).toHaveLength(2);
    expect(reclamos[0]?.cuerpo).toEqual({ version_esperada: 2 });
    expect(reclamos[1]?.cuerpo).toEqual({ version_esperada: 4 });
  });

  it('un envío nuevo tras un éxito genera otro client_message_id', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');

    await usuario.type(composer(), 'Primer mensaje');
    await usuario.click(botonDelPanel('Enviar mensaje'));
    await waitFor(() => expect(within(panel()).getAllByText('Primer mensaje')).toHaveLength(1));
    await waitFor(() => expect(composer()).toHaveValue(''));
    await usuario.type(composer(), 'Segundo mensaje');
    await usuario.click(botonDelPanel('Enviar mensaje'));
    await waitFor(() => expect(within(panel()).getAllByText('Segundo mensaje')).toHaveLength(1));

    const [primero, segundo] = solicitudes('enviar');
    expect(solicitudes('enviar')).toHaveLength(2);
    expect(primero?.cuerpo?.client_message_id).toEqual(expect.any(String));
    expect(segundo?.cuerpo?.client_message_id).not.toBe(primero?.cuerpo?.client_message_id);
  });

  it('un reintento tras un 5xx reutiliza el mismo client_message_id', async () => {
    const usuario = userEvent.setup();
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');

    forzarFalloConversaciones('enviar', { tipo: 'http', status: 502 });
    await usuario.type(composer(), 'Mensaje con 5xx');
    await usuario.click(botonDelPanel('Enviar mensaje'));
    await within(panel()).findByRole('alert');
    await usuario.click(botonDelPanel('Enviar mensaje'));
    await waitFor(() => expect(within(panel()).getAllByText('Mensaje con 5xx')).toHaveLength(1));

    const [primero, segundo] = solicitudes('enviar');
    expect(segundo?.cuerpo?.client_message_id).toBe(primero?.cuerpo?.client_message_id);
  });
});

/* -------------------------------------------------------------------------- */
/* Recibos de lectura (Req 8.8)                                                  */
/* -------------------------------------------------------------------------- */

describe('Recibo de lectura', () => {
  const esperarRecibos = (cantidad: number) =>
    waitFor(() => expect(solicitudes('recibo')).toHaveLength(cantidad));

  it('se envía una vez al abrir y no se repite con las vueltas de polling sin mensajes nuevos', async () => {
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');
    await esperarRecibos(1);
    expect(solicitudes('recibo')[0]?.cuerpo).toEqual({ hasta_secuencia: 15 });

    for (let vuelta = 0; vuelta < 4; vuelta += 1) await dispararPolling();
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
    expect(solicitudes('recibo')).toHaveLength(1);
  });

  it('vuelve a enviarse solo cuando avanza la última secuencia', async () => {
    renderBandeja(ID.mia);
    await esperarBotonDelPanel('Devolver al pool');
    await esperarRecibos(1);

    simularMensajeDeClienteMock(ID.mia, 'Mensaje nuevo del cliente');
    await dispararPolling();
    await esperarRecibos(2);
    expect(solicitudes('recibo')[1]?.cuerpo).toEqual({ hasta_secuencia: 16 });

    await dispararPolling();
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
    expect(solicitudes('recibo')).toHaveLength(2);
  });

  it('no se envía si el usuario no es el reclamante activo', async () => {
    renderBandeja(ID.deOtro);
    await within(panel()).findByText('Lo estamos revisando.');
    await dispararPolling();
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
    expect(solicitudes('recibo')).toHaveLength(0);
  });
});
