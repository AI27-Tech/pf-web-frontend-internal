import { describe, expect, it } from 'vitest';

import {
  bloqueoDeCierre,
  motivosPermitidos,
  puedeCerrar,
  tipoDeCierre,
  ventanaDeEscritura,
  ventanaTrasCierre,
} from '@/features/viajes/detalle/cierreViaje';
import { EstadoViaje } from '@/lib/contracts/viajeDetalle';

const incidenciaAbierta = [{ tipo: 'INCIDENCIA' as const, abierta_en: '2026-10-30T10:00:00Z' }];

describe('reglas puras del cierre del servicio', () => {
  it('faculta únicamente a Jefe Operativo y Administrador', () => {
    expect(puedeCerrar('jefe_operativo')).toBe(true);
    expect(puedeCerrar('administrador')).toBe(true);
    expect(puedeCerrar('supervisor')).toBe(false);
    expect(puedeCerrar('monitorista')).toBe(false);
  });

  it('deriva el tipo de cierre desde las acciones contractuales', () => {
    expect(tipoDeCierre(EstadoViaje.EnTransito)).toBe('anticipado');
    expect(tipoDeCierre(EstadoViaje.EnDestino)).toBe('normal');
    expect(tipoDeCierre(EstadoViaje.EnDescarga)).toBe('normal');
    expect(tipoDeCierre(EstadoViaje.Cerrado)).toBeNull();
  });

  it('bloquea el cierre anticipado sin incidencia abierta', () => {
    expect(bloqueoDeCierre(EstadoViaje.EnTransito, [])).toBe(
      'El cierre anticipado solo es válido con una incidencia abierta',
    );
    expect(bloqueoDeCierre(EstadoViaje.EnTransito, incidenciaAbierta)).toBeNull();
  });

  it('no agrega bloqueos al cierre normal', () => {
    expect(bloqueoDeCierre(EstadoViaje.EnDestino, [])).toBeNull();
    expect(bloqueoDeCierre(EstadoViaje.EnDescarga, [])).toBeNull();
  });

  it('ofrece solo por incidencia para el cierre anticipado', () => {
    expect(motivosPermitidos('anticipado')).toEqual(['por_incidencia']);
    expect(motivosPermitidos('normal')).toEqual(['normal', 'por_incidencia']);
  });

  it('comunica la ventana sin calcular fechas', () => {
    expect(ventanaTrasCierre('normal')).toBe('3 días más');
    expect(ventanaTrasCierre('por_incidencia')).toBe('6 meses');
    expect(ventanaDeEscritura('normal')).toBe('3 días');
    expect(ventanaDeEscritura('por_incidencia')).toBe('6 meses');
  });
});
