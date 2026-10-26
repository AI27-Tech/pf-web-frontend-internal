/*
 * Contract test de sesion contra el tracer (E8-T3, Definicion de terminado).
 *
 * No habla con un backend: afirma que la forma que el portal produce y consume casa
 * con el contrato generado `@ai27-tech/contracts`. Proteccion doble:
 *
 *   - De TIPO (typecheck): el fixture del mock se declara `satisfies` contra el
 *     `Sesion`/`CredencialesEntrada`/`RefrescoEntrada` del tracer. Si el contrato
 *     renombra o quita un campo, este archivo deja de compilar.
 *   - De RUNTIME (este test): confirma que el mock trae las claves del contrato
 *     (`sesion_id`, sin objeto `usuario`, sin `expires_in`), que su `access_token`
 *     lleva claims decodificables, y que el parser deriva rol/audiencia de esos
 *     claims (no del cuerpo) y preserva `sesionId`.
 *
 * Cubre tambien la regla de R5: un token con rol fuera del enum no produce sesion.
 */

import { describe, expect, it } from 'vitest';
import type { components } from '@ai27-tech/contracts/openapi/bff';

import { DEMO_CREDENTIALS, createSessionWire } from '@/mocks/data';
import { parseSesion, SesionInvalidaError, decodificarClaims } from '@/lib/contracts';

type Sesion = components['schemas']['Sesion'];
type CredencialesEntrada = components['schemas']['CredencialesEntrada'];
type RefrescoEntrada = components['schemas']['RefrescoEntrada'];

describe('contrato de sesion (tracer)', () => {
  it('el fixture del mock satisface el tipo Sesion del contrato', () => {
    const wire = createSessionWire() satisfies Sesion;
    expect(wire).toBeTruthy();
  });

  it('la respuesta de sesion trae las claves del contrato, no las inventadas', () => {
    const wire = createSessionWire();

    expect(wire).toHaveProperty('sesion_id');
    expect(wire).toHaveProperty('access_token');
    expect(wire).toHaveProperty('expira_en');

    // Las formas viejas e incompatibles que `internal` asumia NO deben reaparecer.
    expect(wire).not.toHaveProperty('usuario');
    expect(wire).not.toHaveProperty('expires_in');
  });

  it('las credenciales demo casan con CredencialesEntrada del contrato', () => {
    const credenciales = {
      usuario: DEMO_CREDENTIALS.usuario,
      contrasena: DEMO_CREDENTIALS.contrasena,
    } satisfies CredencialesEntrada;

    expect(Object.keys(credenciales).sort()).toEqual(['contrasena', 'usuario']);
  });

  it('el refresco se tipa contra RefrescoEntrada del contrato', () => {
    const body: RefrescoEntrada = { refresh_token: 'rt-mock' };
    expect(body.refresh_token).toBe('rt-mock');
  });

  it('el access_token del mock lleva claims decodificables', () => {
    const wire = createSessionWire();
    const claims = decodificarClaims(wire.access_token);

    expect(claims).not.toBeNull();
    // El sesion_id del cuerpo y el del claim coinciden (coherencia del mock).
    expect(claims?.sesion_id).toBe(wire.sesion_id);
  });

  it('parseSesion deriva rol/audiencia de los claims y preserva sesionId', () => {
    const wire = createSessionWire();
    const sesion = parseSesion(wire);

    expect(sesion.sesionId).toBe(wire.sesion_id);
    expect(sesion.accessToken).toBe(wire.access_token);
    // El rol/audiencia NO vienen del cuerpo (no existen ahi): salen del token.
    expect(sesion.usuario.rol).toBe('jefe_operativo');
    expect(sesion.usuario.audiencia).toBe('Interno');
  });

  it('un token con rol fuera del enum no produce sesion (R5)', () => {
    // Token con payload base64url cuyo `rol` no es uno de los 8 de DEC-053.
    const payload = btoa(JSON.stringify({ sub: 'x', rol: 'intruso', sesion_id: 's1' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const tokenInvalido = `header.${payload}.firma`;

    const wire: Sesion = {
      sesion_id: 's1',
      access_token: tokenInvalido,
      expira_en: new Date().toISOString(),
    };

    expect(() => parseSesion(wire)).toThrow(SesionInvalidaError);
  });
});
