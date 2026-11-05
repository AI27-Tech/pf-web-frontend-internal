/*
 * Pruebas de causaTransicion.ts (E8-T8, Req 2.5).
 *
 * Verifica qué destinos exigen causa obligatoria antes de transicionar.
 */

import { describe, expect, it } from 'vitest';

import { requiereCausa } from '@/features/viajes/detalle/causaTransicion';
import { EstadoViaje } from '@/lib/contracts/viajeDetalle';

describe('requiereCausa', () => {
  it('exige causa para rechazos y cancelación (DEC-020 #2)', () => {
    expect(requiereCausa(EstadoViaje.RechazadoPorAi27)).toBe(true);
    expect(requiereCausa(EstadoViaje.RechazadoPorCliente)).toBe(true);
    expect(requiereCausa(EstadoViaje.Cancelado)).toBe(true);
  });

  it('no exige causa para avances normales del bucle', () => {
    expect(requiereCausa(EstadoViaje.Aprobado)).toBe(false);
    expect(requiereCausa(EstadoViaje.Asignado)).toBe(false);
    expect(requiereCausa(EstadoViaje.EnTransito)).toBe(false);
    expect(requiereCausa(EstadoViaje.EnDestino)).toBe(false);
    expect(requiereCausa(EstadoViaje.EnDescarga)).toBe(false);
    expect(requiereCausa(EstadoViaje.Cerrado)).toBe(false);
  });
});
