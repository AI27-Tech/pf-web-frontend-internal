/*
 * E8-T19 · tratamiento del 403 (PR #28): el 403 significa falta de permiso con la
 * sesión vigente. No cierra la sesión y la interfaz lo muestra como "sin permiso".
 * El 401 sí es un problema de sesión y pasa sin transformar.
 */

import { describe, expect, it } from 'vitest';

import { ApiError, esProhibido, esSesionInvalida } from '@/lib/api/errors';
import {
  ErrorAutoescaladaBloqueada,
  ErrorAutorizacionInsuficiente,
  clasificarFallo,
  textoDeFallo,
} from '@/features/administracion/clasificarError';
import { TEXTOS_ADMINISTRACION as TEXTOS } from '@/features/administracion/mensajes';

describe('E8-T19 · 403 es prohibido, no sesión inválida', () => {
  it('un 403 en una operación se clasifica como prohibido y no cierra la sesión', () => {
    const original = new ApiError('prohibido', 'PUT /sujetos/x/rol → 403', 403);

    const clasificado = clasificarFallo('fijarRol', original, 'ajeno');

    expect(clasificado).toBeInstanceOf(ErrorAutorizacionInsuficiente);
    expect(esProhibido(clasificado)).toBe(true);
    expect(esSesionInvalida(clasificado)).toBe(false);
    expect(textoDeFallo(clasificado)).toBe(TEXTOS.autorizacionInsuficiente);
  });

  it('un 403 de cambio de rol sobre el propio sujeto es prohibido con el aviso de auto-escalada', () => {
    const original = new ApiError('prohibido', 'PUT /sujetos/x/rol → 403', 403);

    const clasificado = clasificarFallo('fijarRol', original, 'propio');

    expect(clasificado).toBeInstanceOf(ErrorAutoescaladaBloqueada);
    expect(esProhibido(clasificado)).toBe(true);
    expect(esSesionInvalida(clasificado)).toBe(false);
  });

  it('un 401 pasa sin transformar y no se presenta como permiso', () => {
    const original = new ApiError('noAutorizado', 'token vencido', 401);

    const clasificado = clasificarFallo('fijarRol', original, 'ajeno');

    expect(clasificado).toBe(original);
    expect(esSesionInvalida(clasificado)).toBe(true);
    expect(textoDeFallo(clasificado)).toBeNull();
  });
});
