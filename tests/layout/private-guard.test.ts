/*
 * E8-T4 — Definición de terminado: "la guarda redirige conservando ?redirect=".
 *
 * Prueba la decisión pura de la guarda privada: sin sesión redirige a /login
 * preservando el destino en search.redirect; con sesión deja pasar.
 */

import { describe, expect, it } from 'vitest';

import { resolverGuardaPrivada } from '@/routes/_private';

describe('E8-T4 · guarda de rutas privadas', () => {
  it('sin sesión redirige a /login conservando el destino en ?redirect=', () => {
    const destino = '/viajes?estado=EN_TRANSITO';
    const decision = resolverGuardaPrivada(false, destino);

    expect(decision).toEqual({
      to: '/login',
      search: { redirect: destino },
    });
  });

  it('con sesión deja pasar (no redirige)', () => {
    expect(resolverGuardaPrivada(true, '/viajes')).toBeNull();
  });
});
