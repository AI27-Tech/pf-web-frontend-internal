/*
 * M2 · Bandeja de viajes por rol (spec `afinacion-roles-modulo-a-modulo`, Requirement 3).
 *
 * Cubren: columnas Cliente y Escolta con respaldos, "Crear viaje" por capacidad, el vacío
 * que distingue "sin clientes asignados" de "sin viajes" (E11, E12), el `403` y las llamadas
 * que no deben ocurrir (`obtenerMiAlcance` solo con lista vacía y un rol con alcance propio).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';

import { BandejaViajes } from '@/features/viajes/BandejaViajes';
import { ROLES_INTERNOS } from '@/lib/permisos/roles';
import { puede } from '@/lib/permisos';
import { BFF_VIAJES, server } from './mswServer';

const BFF_ALCANCE = '*/api/v1/sesion/alcance';

let rolActual: string | undefined;
const navigateSpy = vi.fn();

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-de-prueba' },
    usuario: rolActual ? { id: 'u-1', rol: rolActual } : null,
    logout: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
  Link: ({ children, ...props }: { children: ReactNode; 'aria-label'?: string }) => (
    <a {...props}>{children}</a>
  ),
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  navigateSpy.mockReset();
  rolActual = undefined;
});
afterAll(() => server.close());

function renderBandeja() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<BandejaViajes />, { wrapper: Wrapper });
}

const VACIA = { items: [], cursor_siguiente: null };

/** Registra el listado y cuenta cuántas veces se pide el alcance propio. */
function servir(listado: unknown, alcance?: { clientes_efectivos_ids: string[] } | 'prohibido') {
  const llamadasAlcance = { total: 0 };
  server.use(
    http.get(BFF_VIAJES, () => HttpResponse.json(listado as object)),
    http.get(BFF_ALCANCE, () => {
      llamadasAlcance.total += 1;
      if (alcance === 'prohibido' || alcance === undefined) {
        return HttpResponse.json({ codigo: 'prohibido' }, { status: 403 });
      }
      return HttpResponse.json(alcance);
    }),
  );
  return llamadasAlcance;
}

describe('columnas Cliente y Escolta', () => {
  it('muestra el nombre del cliente y los económicos de la escolta', async () => {
    rolActual = 'monitorista';
    servir({
      items: [
        {
          id: 'VJ-1',
          estado: 'EN_TRANSITO',
          origen: 'CDMX',
          cliente: { id: 'CLI-1', nombre: 'Cliente Norte' },
          unidades: [
            { id: 'UN-1', economico: 'P-101' },
            { id: 'UN-2', economico: 'M-07' },
          ],
        },
      ],
      cursor_siguiente: null,
    });
    renderBandeja();

    expect(await screen.findByText('Cliente Norte')).toBeInTheDocument();
    expect(screen.getByText('P-101, M-07')).toBeInTheDocument();
  });

  it('respalda con el id si falta el nombre o el económico', async () => {
    rolActual = 'monitorista';
    servir({
      items: [
        {
          id: 'VJ-2',
          estado: 'APROBADO',
          origen: 'MTY',
          cliente: { id: 'CLI-9999' },
          unidades: [{ id: 'UN-7' }],
        },
      ],
      cursor_siguiente: null,
    });
    renderBandeja();

    expect(await screen.findByText('CLI-9999')).toBeInTheDocument();
    expect(screen.getByText('UN-7')).toBeInTheDocument();
  });

  it('muestra "Sin escolta" cuando las unidades vienen vacías o ausentes', async () => {
    rolActual = 'jefe_operativo';
    servir({
      items: [
        { id: 'VJ-3', estado: 'APROBADO', origen: 'A', unidades: [] },
        { id: 'VJ-4', estado: 'APROBADO', origen: 'B' },
      ],
      cursor_siguiente: null,
    });
    renderBandeja();

    await waitFor(() => expect(screen.getAllByText('Sin escolta')).toHaveLength(2));
  });
});

describe('botón "Crear viaje" por capacidad', () => {
  it.each(ROLES_INTERNOS.map((rol) => [rol] as const))('%s', async (rol) => {
    rolActual = rol;
    servir({ items: [{ id: 'VJ-1', estado: 'APROBADO', origen: 'CDMX' }], cursor_siguiente: null });
    renderBandeja();

    await screen.findByText('VJ-1');
    const boton = screen.queryByRole('button', { name: 'Crear viaje' });
    if (puede(rol, 'viaje.crear')) expect(boton).toBeInTheDocument();
    else expect(boton).not.toBeInTheDocument();
  });
});

describe('lista vacía y alcance propio (E11, E12)', () => {
  it.each(['monitorista', 'supervisor', 'coordinador'])(
    '%s sin clientes asignados ve "Sin clientes asignados"',
    async (rol) => {
      rolActual = rol;
      const llamadas = servir(VACIA, { clientes_efectivos_ids: [] });
      renderBandeja();

      expect(await screen.findByText('Sin clientes asignados')).toBeInTheDocument();
      expect(llamadas.total).toBe(1);
    },
  );

  it('con clientes pero sin viajes ve "Sin viajes"', async () => {
    rolActual = 'monitorista';
    const llamadas = servir(VACIA, { clientes_efectivos_ids: ['CLI-1001'] });
    renderBandeja();

    expect(await screen.findByText('Sin viajes')).toBeInTheDocument();
    expect(screen.queryByText('Sin clientes asignados')).not.toBeInTheDocument();
    expect(llamadas.total).toBe(1);
  });

  it('si el alcance falla con 403 cae a "Sin viajes", sin error de pantalla', async () => {
    rolActual = 'monitorista';
    servir(VACIA, 'prohibido');
    renderBandeja();

    expect(await screen.findByText('Sin viajes')).toBeInTheDocument();
  });

  it.each(['jefe_operativo', 'administrador'])(
    '%s con lista vacía ve "Sin viajes" y no pide el alcance (propiedad 5)',
    async (rol) => {
      rolActual = rol;
      const llamadas = servir(VACIA, { clientes_efectivos_ids: [] });
      renderBandeja();

      expect(await screen.findByText('Sin viajes')).toBeInTheDocument();
      expect(llamadas.total).toBe(0);
    },
  );

  it('un monitorista con viajes no pide el alcance (propiedad 5)', async () => {
    rolActual = 'monitorista';
    const llamadas = servir({
      items: [{ id: 'VJ-1', estado: 'APROBADO', origen: 'CDMX' }],
      cursor_siguiente: null,
    });
    renderBandeja();

    await screen.findByText('VJ-1');
    expect(llamadas.total).toBe(0);
  });
});

describe('403 del listado', () => {
  it.each(['ejecutivo', 'reaccion'])(
    '%s: el bff responde 403 y se avisa la falta de permiso',
    async (rol) => {
      rolActual = rol;
      server.use(
        http.get(BFF_VIAJES, () => HttpResponse.json({ codigo: 'prohibido' }, { status: 403 })),
      );
      renderBandeja();

      expect(
        await screen.findByText('No tienes permiso para ver el listado de viajes.'),
      ).toBeInTheDocument();
    },
  );
});
