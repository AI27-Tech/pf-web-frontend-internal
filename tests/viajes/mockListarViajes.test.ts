/*
 * Requirement T3 · el mock de `listarViajes` y `obtenerMiAlcance` reproduce la guarda del contrato.
 *
 * `403` para ejecutivo y reacción, filtro por "mis clientes" para monitoreo, viajes con
 * `cliente` y `unidades`, y `obtenerMiAlcance` solo para monitorista, supervisor y coordinador.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';
import { mockAccessToken, CLIENTES_EFECTIVOS_DEMO } from '@/mocks/data';
import { reiniciarAlmacenMock } from '@/mocks/almacen-viajes';
import { API_PREFIX } from '@/lib/constants';
import { ROLES_INTERNOS } from '@/lib/permisos/roles';
import { puede } from '@/lib/permisos';
import type { Rol } from '@/lib/contracts';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => reiniciarAlmacenMock());
afterAll(() => server.close());

const llamar = (ruta: string, rol: Rol | null) =>
  fetch(`${window.location.origin}${API_PREFIX}${ruta}`, {
    headers: rol ? { Authorization: `Bearer ${mockAccessToken(rol)}` } : {},
  });

describe('GET /viajes (mock)', () => {
  it.each(ROLES_INTERNOS.map((rol) => [rol] as const))('%s', async (rol) => {
    const respuesta = await llamar('/viajes', rol);
    expect(respuesta.status).toBe(puede(rol, 'viajes.listar') ? 200 : 403);
  });

  it('sin token responde 401', async () => {
    expect((await llamar('/viajes', null)).status).toBe(401);
  });

  it('el monitorista solo ve viajes de los clientes de su alcance', async () => {
    const cuerpo = (await (await llamar('/viajes', 'monitorista')).json()) as {
      items: { id: string; cliente?: { id: string } }[];
    };
    const permitidos = CLIENTES_EFECTIVOS_DEMO['monitorista'] ?? [];
    expect(cuerpo.items.length).toBeGreaterThan(0);
    for (const viaje of cuerpo.items) {
      expect(permitidos).toContain(viaje.cliente?.id);
    }
  });

  it('el jefe operativo ve viajes de todos los clientes', async () => {
    const jo = (await (await llamar('/viajes', 'jefe_operativo')).json()) as { items: unknown[] };
    const mon = (await (await llamar('/viajes', 'monitorista')).json()) as { items: unknown[] };
    expect(jo.items.length).toBeGreaterThan(mon.items.length);
  });

  it('cada viaje trae cliente y la escolta con su económico', async () => {
    const cuerpo = (await (await llamar('/viajes', 'jefe_operativo')).json()) as {
      items: {
        id: string;
        cliente?: { id: string; nombre?: string };
        unidades?: { id: string; economico?: string }[];
      }[];
    };
    const v1001 = cuerpo.items.find((v) => v.id === 'VJ-1001');
    expect(v1001?.cliente).toEqual({ id: 'CLI-1001', nombre: 'Cliente Norte' });
    expect(v1001?.unidades?.[0]?.economico).toBeTruthy();
    // Cliente que no está en el catálogo: sin nombre; el consumidor muestra el id.
    const v1009 = cuerpo.items.find((v) => v.id === 'VJ-1009');
    expect(v1009?.cliente).toEqual({ id: 'CLI-9999' });
  });
});

describe('GET /sesion/alcance (mock)', () => {
  it.each(ROLES_INTERNOS.map((rol) => [rol] as const))('%s', async (rol) => {
    const respuesta = await llamar('/sesion/alcance', rol);
    expect(respuesta.status).toBe(puede(rol, 'alcance.leerPropio') ? 200 : 403);
    if (respuesta.status === 200) {
      expect(await respuesta.json()).toEqual({
        clientes_efectivos_ids: CLIENTES_EFECTIVOS_DEMO[rol],
      });
    }
  });
});
