/*
 * M4 · Detalle del viaje por rol (spec `afinacion-roles-modulo-a-modulo`, Requirement 5).
 *
 * Cubren: transiciones por estado y rol (E1, E2, E6), ETA, botón de emergencia y pestañas por
 * capacidad, `404` como "no encontrado" (E5), `403` del detalle y `403` o `404` al enviar una
 * acción (E8, T2). Montan `ViajeShell` y `DetalleViaje` con MSW contra el bff.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { DetalleViaje } from '@/features/viajes/detalle/DetalleViaje';
import { accionesDesde, accionesPermitidas } from '@/features/viajes/detalle/accionesTransicion';
import { ViajeShell } from '@/features/viajes/ViajeShell';
import { API_PREFIX } from '@/lib/constants';
import { EstadoViaje } from '@/lib/contracts/viajeDetalle';
import { CAPACIDADES, capacidadDeTransicion, puede } from '@/lib/permisos';
import { ROLES_INTERNOS } from '@/lib/permisos/roles';

const path = (segment: string) => `${API_PREFIX}${segment}`;

const navigateSpy = vi.fn();
let rolActual: string | undefined;

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: rolActual ? { id: 'u-1', rol: rolActual } : null,
    logout: vi.fn(),
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
  navigateSpy.mockReset();
  rolActual = undefined;
});
afterAll(() => server.close());

function detalle(estado: string) {
  return {
    viaje: {
      id: 'VJ-9',
      estado,
      origen: 'Origen de prueba',
      destinos: [{ nombre: 'Destino 1', numero_envio: 'ENV-9' }],
      fecha_hora_servicio: '2026-11-20T10:00:00Z',
      creado_en: new Date().toISOString(),
    },
    condiciones_activas: [],
  };
}

/** Sirve el detalle y la lista de casos del viaje (la piden los roles con carril). */
function servir(estado: string) {
  server.use(
    http.get(path('/viajes/:id/detalle'), () => HttpResponse.json(detalle(estado))),
    http.get(path('/panel/viajes/:id/emergencias'), () => HttpResponse.json({ items: [] })),
  );
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

const MONITOREO = ['monitorista', 'supervisor', 'coordinador'] as const;

describe('accionesPermitidas: transiciones por rol (propiedades de la política)', () => {
  const ESTADOS = Object.values(EstadoViaje);

  it('todo destino ofrecido tiene capacidad y el rol la tiene', () => {
    for (const rol of ROLES_INTERNOS) {
      for (const estado of ESTADOS) {
        for (const destino of accionesPermitidas(accionesDesde(estado), rol)) {
          const capacidad = capacidadDeTransicion(destino);
          expect(capacidad, `${estado}→${destino}`).toBeTruthy();
          expect(puede(rol, capacidad!), `${rol} ${estado}→${destino}`).toBe(true);
        }
      }
    }
  });

  it('un rol sin capacidades, nulo o desconocido no recibe ninguna acción', () => {
    for (const rol of ['rol_inventado', '', null, undefined]) {
      expect(accionesPermitidas(accionesDesde(EstadoViaje.Asignado), rol)).toEqual([]);
    }
    expect(CAPACIDADES.length).toBeGreaterThan(0);
  });

  it('nunca ofrece la cancelación, que dispara el cliente', () => {
    for (const rol of ROLES_INTERNOS) {
      for (const estado of ESTADOS) {
        expect(accionesPermitidas(accionesDesde(estado), rol)).not.toContain(
          EstadoViaje.CanceladoPorCliente,
        );
      }
    }
  });

  it('desde ASIGNADO el avance directo es de avance: JO no lo tiene y MON sí (E6)', () => {
    const jo = accionesPermitidas(accionesDesde(EstadoViaje.Asignado), 'jefe_operativo');
    const mon = accionesPermitidas(accionesDesde(EstadoViaje.Asignado), 'monitorista');
    expect(jo).toEqual([EstadoViaje.AptoParaSalida]);
    expect(mon).toEqual(
      expect.arrayContaining([
        EstadoViaje.AptoParaSalida,
        EstadoViaje.EnEmbarque,
        EstadoViaje.EnTransito,
      ]),
    );
  });
});

describe('E1 y E2: asignar escolta en un viaje APROBADO', () => {
  it.each(['jefe_operativo', 'administrador'])('%s ve "Asignar escolta"', async (rol) => {
    rolActual = rol;
    servir('APROBADO');
    renderDetalle();
    expect(await screen.findByRole('button', { name: 'Asignar escolta' })).toBeInTheDocument();
  });

  it.each(MONITOREO)('%s no ve "Asignar escolta" ni acciones', async (rol) => {
    rolActual = rol;
    servir('APROBADO');
    renderDetalle();
    await screen.findByRole('button', { name: 'Editar ETA' });
    expect(screen.queryByRole('button', { name: 'Asignar escolta' })).not.toBeInTheDocument();
    expect(screen.queryByText('Acciones')).not.toBeInTheDocument();
  });
});

describe('E1: JO no ve avance, ETA ni emergencia', () => {
  it('en un viaje ASIGNADO solo ofrece marcar apto', async () => {
    rolActual = 'jefe_operativo';
    servir('ASIGNADO');
    renderDetalle();
    expect(await screen.findByRole('button', { name: /Apto para salida/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /En recorrido/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /En embarque/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar ETA' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activar emergencia' })).not.toBeInTheDocument();
  });
});

describe('E6: avance directo desde ASIGNADO', () => {
  it.each(MONITOREO)('%s lo ve', async (rol) => {
    rolActual = rol;
    servir('ASIGNADO');
    renderDetalle();
    expect(await screen.findByRole('button', { name: /En recorrido/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apto para salida/ })).toBeInTheDocument();
  });
});

describe('cerrar el servicio', () => {
  it.each(['jefe_operativo', 'administrador'])('%s ve "Cerrar servicio"', async (rol) => {
    rolActual = rol;
    servir('EN_DESTINO');
    renderDetalle();
    expect(await screen.findByRole('button', { name: 'Cerrar servicio' })).toBeInTheDocument();
  });

  it.each(MONITOREO)('%s no ve "Cerrar servicio" y sí el avance', async (rol) => {
    rolActual = rol;
    servir('EN_DESTINO');
    renderDetalle();
    expect(await screen.findByRole('button', { name: /En descarga/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar servicio' })).not.toBeInTheDocument();
  });
});

describe('ETA y emergencia por capacidad', () => {
  it.each([...MONITOREO, 'administrador'])('%s ve ETA y activar emergencia', async (rol) => {
    rolActual = rol;
    servir('EN_TRANSITO');
    renderDetalle();
    expect(await screen.findByRole('button', { name: 'Editar ETA' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activar emergencia' })).toBeInTheDocument();
  });

  it('un viaje terminal no ofrece ETA ni emergencia a nadie', async () => {
    rolActual = 'administrador';
    servir('CERRADO');
    renderDetalle();
    expect(await screen.findByText('Este viaje está cerrado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar ETA' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activar emergencia' })).not.toBeInTheDocument();
    expect(screen.queryByText('Acciones')).not.toBeInTheDocument();
  });
});

describe('pestañas por capacidad', () => {
  it('JO ve Detalle, Ficha técnica e Histórico; no Expediente', async () => {
    rolActual = 'jefe_operativo';
    servir('APROBADO');
    renderDetalle();
    expect(await screen.findByRole('tab', { name: 'Detalle' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ficha técnica' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Histórico del viaje' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Expediente y evidencia' })).not.toBeInTheDocument();
  });

  it.each([...MONITOREO, 'administrador'])('%s ve las cuatro', async (rol) => {
    rolActual = rol;
    servir('APROBADO');
    renderDetalle();
    expect(await screen.findByRole('tab', { name: 'Detalle' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ficha técnica' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Histórico del viaje' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Expediente y evidencia' })).toBeInTheDocument();
  });
});

describe('errores del detalle (T2)', () => {
  it('E5: un 404 se muestra como "no encontrado" sin hablar de permisos', async () => {
    rolActual = 'monitorista';
    server.use(
      http.get(path('/viajes/:id/detalle'), () =>
        HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 }),
      ),
      http.get(path('/panel/viajes/:id/emergencias'), () => HttpResponse.json({ items: [] })),
    );
    renderDetalle();
    expect(await screen.findByText('Viaje no encontrado')).toBeInTheDocument();
    expect(screen.queryByText(/permiso|rol|alcance/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument();
  });

  it('un 403 dice "sin permiso" y no pide el rol ni el alcance', async () => {
    rolActual = 'monitorista';
    server.use(
      http.get(path('/viajes/:id/detalle'), () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
      http.get(path('/panel/viajes/:id/emergencias'), () => HttpResponse.json({ items: [] })),
    );
    renderDetalle();
    const aviso = await screen.findByText('No tienes permiso para ver el detalle de este viaje.');
    expect(aviso.textContent).not.toMatch(/alcance/i);
  });
});

describe('errores al enviar una acción (T2.3, T2.4)', () => {
  it('E8: un 403 al transicionar avisa con Toast y deja el detalle intacto', async () => {
    rolActual = 'monitorista';
    servir('ASIGNADO');
    server.use(
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json({ codigo: 'prohibido' }, { status: 403 }),
      ),
    );
    renderDetalle();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Apto para salida/ }));
    expect(await screen.findByText('No tienes permiso para realizar esta acción.')).toBeVisible();
    expect(screen.getByRole('button', { name: /Apto para salida/ })).toBeInTheDocument();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('un 404 al transicionar dice "ya no está disponible" y vuelve a la lista', async () => {
    rolActual = 'monitorista';
    servir('ASIGNADO');
    server.use(
      http.post(path('/viajes/:id/transiciones'), () =>
        HttpResponse.json({ codigo: 'no_encontrado' }, { status: 404 }),
      ),
    );
    renderDetalle();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Apto para salida/ }));
    expect(await screen.findByText('Este viaje ya no está disponible.')).toBeVisible();
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith({ to: '/viajes' }));
  });
});
