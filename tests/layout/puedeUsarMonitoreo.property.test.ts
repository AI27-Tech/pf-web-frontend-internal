/**
 * Feature: e8-t17-dashboard-descarga-evidencia, Property 4: Afordancia por rol y clasificación
 * de la negación. Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 4.2, 4.7, 4.8 (tarea 11).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import fc from 'fast-check';

import type { Rol as RolTipo } from '@ai27-tech/contracts/roles';

import { puedeUsarMonitoreo } from '@/features/monitoreo/puedeUsarMonitoreo';
import {
  descargarViaje,
  ErrorDescargaProhibida,
  ErrorViajeInexistente,
} from '@/lib/api/expediente';
import { API_PREFIX } from '@/lib/constants';

const ROLES_CON_ACCESO: readonly RolTipo[] = [
  'monitorista',
  'supervisor',
  'coordinador',
  'administrador',
];
const TODOS_LOS_ROLES: readonly RolTipo[] = [
  'cliente',
  'jefe_operativo',
  'monitorista',
  'supervisor',
  'coordinador',
  'ejecutivo',
  'reaccion',
  'administrador',
];

const path = (segment: string) => `${API_PREFIX}${segment}`;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

describe('Property 4 · afordancia por rol', () => {
  it('la afordancia es verdadera exactamente para los cuatro roles con acceso', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TODOS_LOS_ROLES), (rol) => {
        expect(puedeUsarMonitoreo(rol)).toBe(ROLES_CON_ACCESO.includes(rol));
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 4 · la negación se clasifica por status', () => {
  it('403 → ErrorDescargaProhibida y 404 → ErrorViajeInexistente, para cualquier viaje', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(403, 404), fc.uuid(), async (status, viajeId) => {
        server.resetHandlers();
        server.use(
          http.get(path('/viajes/:id/descarga'), () =>
            HttpResponse.json({ mensaje: 'negado' }, { status }),
          ),
        );

        const error = await descargarViaje(viajeId, 'token').catch((e: unknown) => e);

        if (status === 403) {
          expect(error).toBeInstanceOf(ErrorDescargaProhibida);
        } else {
          expect(error).toBeInstanceOf(ErrorViajeInexistente);
        }
      }),
      { numRuns: 100 },
    );
  });
});
