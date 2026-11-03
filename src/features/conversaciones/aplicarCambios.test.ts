import { describe, expect, it } from 'vitest';
import { aplicarConversaciones, aplicarMensajes } from './aplicarCambios';
import type { Conversacion, Mensaje } from '@/lib/contracts/conversaciones';

const c = (id: string, version: number) =>
  ({
    id,
    viaje_id: 'v',
    cliente_id: 'cl',
    estado: 'abierta',
    ultima_secuencia: 1,
    version_reclamo: version,
    abierta_en: '2026-01-01T00:00:00Z',
  }) as Conversacion;
const m = (secuencia: number) =>
  ({
    id: `m${secuencia}`,
    conversacion_id: 'c',
    secuencia,
    client_message_id: `x${secuencia}`,
    audiencia_autor: 'Interno',
    alias_mostrado: 'AI27 Operations',
    cuerpo: String(secuencia),
    creado_en: '2026-01-01T00:00:00Z',
  }) as Mensaje;

describe('reducers de conversación', () => {
  it('mezcla por id de forma idempotente', () => {
    const once = aplicarConversaciones([c('a', 1)], [c('b', 2), c('a', 3)]);
    expect(aplicarConversaciones(once, [c('b', 2), c('a', 3)])).toEqual(once);
  });
  it('ordena mensajes por secuencia y elimina duplicados', () => {
    expect(aplicarMensajes([m(2)], [m(1), m(2)])).toEqual([m(1), m(2)]);
  });
});
