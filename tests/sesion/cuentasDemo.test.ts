/*
 * Cuentas demo del modo mock (spec modo-mock-roles-internos, requisitos 1 a 3).
 *
 * Recorre las siete cuentas contra `POST /sesion` y `POST /sesion/refresh` del
 * mock de MSW, sin pasar por la UI. Las pruebas son por ejemplo sobre el catálogo
 * completo porque el dominio es finito.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';

import { API_PREFIX } from '@/lib/constants';
import { decodificarClaims, type ClaimsAi27, type SesionWire } from '@/lib/contracts';
import { CUENTAS_DEMO, sesionDeCuenta, sujetoDeCuenta, type CuentaDemo } from '@/mocks/data';
import { handlers } from '@/mocks/handlers';

const server = setupServer(...handlers);

/** Origen donde MSW resuelve las rutas relativas de los handlers en jsdom. */
const ORIGEN = window.location.origin;
const URL_SESION = `${ORIGEN}${API_PREFIX}/sesion`;
const URL_REFRESH = `${URL_SESION}/refresh`;

/** Contraseña común de las siete cuentas demo (decisión 6 del requisito 1). */
const CONTRASENA = 'demo1234';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

function postJson(url: string, cuerpo: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

/** Inicia sesión con la credencial demo de la cuenta y verifica el 200. */
async function iniciarSesion(cuenta: CuentaDemo): Promise<SesionWire> {
  const respuesta = await postJson(URL_SESION, {
    usuario: `${cuenta}@demo.ai27`,
    contrasena: CONTRASENA,
  });
  expect(respuesta.status).toBe(200);
  return (await respuesta.json()) as SesionWire;
}

/** Decodifica los claims del access_token con el parser de la app. */
function claimsDe(accessToken: string): ClaimsAi27 {
  const claims = decodificarClaims(accessToken);
  if (claims === null) throw new Error('El access_token no se pudo decodificar');
  return claims;
}

/** Claims de la sesión iniciada por cada una de las siete cuentas. */
async function claimsDeTodasLasCuentas(): Promise<ClaimsAi27[]> {
  return Promise.all(
    CUENTAS_DEMO.map(async ({ cuenta }) => claimsDe((await iniciarSesion(cuenta)).access_token)),
  );
}

describe('cuentas demo: inicio de sesión (requisitos 1 y 2)', () => {
  it.each(CUENTAS_DEMO)(
    'responde 200 e inicia sesión como $cuenta con el rol $rol, sub y sesion_id propios',
    async ({ cuenta, rol }) => {
      const sesion = await iniciarSesion(cuenta);
      const claims = claimsDe(sesion.access_token);

      expect(claims.rol).toBe(rol);
      expect(claims.sub).toBe(sujetoDeCuenta(cuenta));
      expect(claims.sesion_id).toBe(sesionDeCuenta(cuenta));
    },
  );
});

describe('cuentas demo: unicidad de sujeto y sesión (requisito 2.3)', () => {
  it('tiene siete cuentas y no repite el sub entre ellas', async () => {
    const claims = await claimsDeTodasLasCuentas();

    expect(claims).toHaveLength(7);
    expect(new Set(claims.map((c) => c.sub)).size).toBe(claims.length);
  });

  it('no repite el sesion_id entre las siete cuentas', async () => {
    const claims = await claimsDeTodasLasCuentas();

    expect(new Set(claims.map((c) => c.sesion_id)).size).toBe(claims.length);
  });
});

describe('cuentas demo: renovación de sesión (requisito 3)', () => {
  it.each(CUENTAS_DEMO)(
    'renueva la sesión de $cuenta conservando rol, sub y sesion_id',
    async ({ cuenta, rol }) => {
      const sesion = await iniciarSesion(cuenta);
      const original = claimsDe(sesion.access_token);

      const respuesta = await postJson(URL_REFRESH, { refresh_token: sesion.refresh_token });
      expect(respuesta.status).toBe(200);

      const renovada = (await respuesta.json()) as SesionWire;
      const claims = claimsDe(renovada.access_token);

      expect(claims.rol).toBe(rol);
      expect(claims.sub).toBe(original.sub);
      expect(claims.sesion_id).toBe(original.sesion_id);
    },
  );

  it('responde 401 sin access_token si el refresh_token no es de ninguna cuenta', async () => {
    const respuesta = await postJson(URL_REFRESH, { refresh_token: 'rt-invento' });

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).not.toHaveProperty('access_token');
  });
});

describe('cuentas demo: credenciales inválidas (requisito 1.3)', () => {
  it.each([
    {
      caso: 'contraseña incorrecta',
      cuerpo: { usuario: 'operador@demo.ai27', contrasena: 'otra-clave' },
    },
    {
      caso: 'usuario desconocido',
      cuerpo: { usuario: 'desconocido@demo.ai27', contrasena: CONTRASENA },
    },
    {
      caso: 'usuario en mayúsculas (la coincidencia distingue mayúsculas)',
      cuerpo: { usuario: 'OPERADOR@demo.ai27', contrasena: CONTRASENA },
    },
    {
      caso: 'usuario y contraseña vacíos',
      cuerpo: { usuario: '', contrasena: '' },
    },
    {
      caso: 'contraseña ausente',
      cuerpo: { usuario: 'operador@demo.ai27' },
    },
    {
      caso: 'todos los campos ausentes',
      cuerpo: {},
    },
  ])('responde 401 sin access_token si hay $caso', async ({ cuerpo }) => {
    const respuesta = await postJson(URL_SESION, cuerpo);

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).not.toHaveProperty('access_token');
  });

  it('responde 401 sin access_token si el cuerpo no es JSON', async () => {
    const respuesta = await fetch(URL_SESION, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'usuario=operador@demo.ai27&contrasena=demo1234',
    });

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).not.toHaveProperty('access_token');
  });
});
