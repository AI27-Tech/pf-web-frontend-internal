import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { accionesDesde } from '@/features/viajes/detalle/accionesTransicion';
import {
  bloqueoDeCierre,
  motivosPermitidos,
  puedeCerrar,
  tipoDeCierre,
  ventanaDeEscritura,
} from '@/features/viajes/detalle/cierreViaje';
import { entradaDeCierre, MOTIVOS_CIERRE } from '@/lib/contracts/cierreViaje';
import { Rol } from '@/lib/contracts';
import { EstadoViaje } from '@/lib/contracts/viajeDetalle';

const ESTADOS = [
  EstadoViaje.Solicitado,
  EstadoViaje.Aprobado,
  EstadoViaje.Asignado,
  EstadoViaje.EnTransito,
  EstadoViaje.EnDestino,
  EstadoViaje.EnDescarga,
  EstadoViaje.Cerrado,
  EstadoViaje.RechazadoPorAi27,
  EstadoViaje.RechazadoPorCliente,
  EstadoViaje.Cancelado,
];

describe('propiedades del cierre del servicio', () => {
  it('Property 1: toda entrada usa CERRADO, un motivo válido y no causa', () => {
    fc.assert(
      fc.property(fc.constantFrom(...MOTIVOS_CIERRE), (motivo) => {
        expect(entradaDeCierre(motivo)).toEqual({
          a_estado: EstadoViaje.Cerrado,
          motivo_cierre: motivo,
        });
        expect(entradaDeCierre(motivo)).not.toHaveProperty('causa');
      }),
    );
  });

  it('Property 2: el cierre anticipado solo permite incidencia y exige incidencia abierta', () => {
    expect(motivosPermitidos('anticipado')).toEqual(['por_incidencia']);
    fc.assert(
      fc.property(fc.boolean(), (hayIncidencia) => {
        const condiciones = hayIncidencia
          ? [{ tipo: 'INCIDENCIA' as const, abierta_en: 'ahora' }]
          : [];
        expect(bloqueoDeCierre(EstadoViaje.EnTransito, condiciones) !== null).toBe(!hayIncidencia);
      }),
    );
  });

  it('Property 3: el cierre normal no se bloquea por condiciones', () => {
    fc.assert(
      fc.property(fc.constantFrom(EstadoViaje.EnDestino, EstadoViaje.EnDescarga), (estado) => {
        expect(bloqueoDeCierre(estado, [])).toBeNull();
      }),
    );
  });

  it('Property 4: los estados terminales no ofrecen cierre', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          EstadoViaje.Cerrado,
          EstadoViaje.RechazadoPorAi27,
          EstadoViaje.RechazadoPorCliente,
          EstadoViaje.Cancelado,
        ),
        (estado) => {
          expect(tipoDeCierre(estado)).toBeNull();
        },
      ),
    );
  });

  it('Property 5: solo los dos roles facultados pueden cerrar', () => {
    fc.assert(
      fc.property(fc.constantFrom(...Object.values(Rol)), (rol) => {
        expect(puedeCerrar(rol)).toBe(rol === Rol.JefeOperativo || rol === Rol.Administrador);
      }),
    );
  });

  it('Property 6: la ventana está definida para todo motivo y no es una fecha', () => {
    fc.assert(
      fc.property(fc.constantFrom(...MOTIVOS_CIERRE), (motivo) => {
        const ventana = ventanaDeEscritura(motivo);
        expect(['3 días', '6 meses']).toContain(ventana);
        expect(Number.isNaN(Date.parse(ventana))).toBe(true);
      }),
    );
  });

  it('Property 7: el tipo de cierre coincide con la arista hacia CERRADO', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ESTADOS), (estado) => {
        const tieneArista = accionesDesde(estado).includes(EstadoViaje.Cerrado);
        expect(tipoDeCierre(estado) !== null).toBe(tieneArista);
      }),
    );
  });

  it('Property 8: EN_TRANSITO con incidencia permite probar el cierre', () => {
    expect(tipoDeCierre(EstadoViaje.EnTransito)).toBe('anticipado');
    expect(
      bloqueoDeCierre(EstadoViaje.EnTransito, [
        {
          tipo: 'INCIDENCIA',
          abierta_en: 'ahora',
        },
      ]),
    ).toBeNull();
  });
});
