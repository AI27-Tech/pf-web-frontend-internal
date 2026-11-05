/**
 * Tests para accionesDesde.
 *
 * Valida que la función derive correctamente las acciones de transición
 * disponibles desde cada estado.
 */

import { describe, expect, it } from 'vitest';
import { accionesDesde } from './accionesTransicion';
import { EstadoViaje, TRANSICIONES_VIAJE, esTerminal } from '@/lib/contracts/viajeDetalle';

describe('accionesDesde', () => {
  // Unit tests: casos específicos y edge cases

  describe('estados terminales', () => {
    it('retorna vacío para RECHAZADO_POR_AI27', () => {
      const acciones = accionesDesde(EstadoViaje.RechazadoPorAi27);
      expect(acciones).toEqual([]);
    });

    it('retorna vacío para RECHAZADO_POR_CLIENTE', () => {
      const acciones = accionesDesde(EstadoViaje.RechazadoPorCliente);
      expect(acciones).toEqual([]);
    });

    it('retorna vacío para CERRADO', () => {
      const acciones = accionesDesde(EstadoViaje.Cerrado);
      expect(acciones).toEqual([]);
    });

    it('retorna vacío para CANCELADO', () => {
      const acciones = accionesDesde(EstadoViaje.Cancelado);
      expect(acciones).toEqual([]);
    });
  });

  describe('estados no terminales', () => {
    it('retorna acciones para SOLICITADO', () => {
      const acciones = accionesDesde(EstadoViaje.Solicitado);
      expect(acciones).toContain(EstadoViaje.Aprobado);
      expect(acciones).toContain(EstadoViaje.RechazadoPorAi27);
      expect(acciones).toContain(EstadoViaje.Cancelado);
      expect(acciones).toHaveLength(3);
    });

    it('retorna acciones para APROBADO', () => {
      const acciones = accionesDesde(EstadoViaje.Aprobado);
      expect(acciones).toContain(EstadoViaje.Asignado);
      expect(acciones).toContain(EstadoViaje.Cancelado);
      expect(acciones).toHaveLength(2);
    });

    it('retorna acciones para ASIGNADO', () => {
      const acciones = accionesDesde(EstadoViaje.Asignado);
      expect(acciones).toContain(EstadoViaje.AptoParaSalida);
      expect(acciones).toContain(EstadoViaje.EnEmbarque);
      expect(acciones).toContain(EstadoViaje.EnTransito);
      expect(acciones).toContain(EstadoViaje.RechazadoPorCliente);
      expect(acciones).toContain(EstadoViaje.Cancelado);
      expect(acciones).toHaveLength(5);
    });

    it('retorna acciones para APTO_PARA_SALIDA', () => {
      const acciones = accionesDesde(EstadoViaje.AptoParaSalida);
      expect(acciones).toContain(EstadoViaje.EnEmbarque);
      expect(acciones).toContain(EstadoViaje.EnTransito);
      expect(acciones).toContain(EstadoViaje.RechazadoPorCliente);
      expect(acciones).toContain(EstadoViaje.Cancelado);
      expect(acciones).toHaveLength(4);
    });

    it('retorna acciones para EN_EMBARQUE', () => {
      const acciones = accionesDesde(EstadoViaje.EnEmbarque);
      expect(acciones).toEqual([EstadoViaje.EnTransito]);
    });

    it('retorna acciones para EN_TRANSITO', () => {
      const acciones = accionesDesde(EstadoViaje.EnTransito);
      expect(acciones).toContain(EstadoViaje.EnDestino);
      expect(acciones).toContain(EstadoViaje.Cerrado);
      expect(acciones).toHaveLength(2);
    });

    it('retorna acciones para EN_DESTINO', () => {
      const acciones = accionesDesde(EstadoViaje.EnDestino);
      expect(acciones).toContain(EstadoViaje.EnDescarga);
      expect(acciones).toContain(EstadoViaje.EnTransito);
      expect(acciones).toContain(EstadoViaje.Cerrado);
      expect(acciones).toHaveLength(3);
    });

    it('retorna acciones para EN_DESCARGA', () => {
      const acciones = accionesDesde(EstadoViaje.EnDescarga);
      expect(acciones).toContain(EstadoViaje.EnTransito);
      expect(acciones).toContain(EstadoViaje.Cerrado);
      expect(acciones).toHaveLength(2);
    });
  });

  describe('exclusión de PATRULLA_EN_CAMINO', () => {
    it('nunca retorna PATRULLA_EN_CAMINO en las acciones', () => {
      // Itera sobre todos los estados posibles
      const todosEstados = Object.values(EstadoViaje);
      for (const estado of todosEstados) {
        const acciones = accionesDesde(estado);
        expect(acciones).not.toContain(EstadoViaje.PatrullaEnCamino);
      }
    });
  });

  describe('propiedades invariantes', () => {
    it('todas las acciones retornadas son destinos válidos desde el estado', () => {
      const todosEstados = Object.values(EstadoViaje);
      for (const estado of todosEstados) {
        const acciones = accionesDesde(estado);
        for (const accion of acciones) {
          const esValido = TRANSICIONES_VIAJE.some(
            ([desde, hacia]) => desde === estado && hacia === accion,
          );
          expect(esValido).toBe(true);
        }
      }
    });

    it('si esTerminal(estado) es true, retorna vacío', () => {
      const todosEstados = Object.values(EstadoViaje);
      for (const estado of todosEstados) {
        const acciones = accionesDesde(estado);
        if (esTerminal(estado)) {
          expect(acciones).toEqual([]);
        }
      }
    });

    it('si esTerminal(estado) es false, puede retornar vacío o más', () => {
      const todosEstados = Object.values(EstadoViaje);
      for (const estado of todosEstados) {
        if (!esTerminal(estado)) {
          const acciones = accionesDesde(estado);
          // Los estados no terminales pueden tener transiciones o no
          // (esta propiedad solo valida que la función no lance error)
          expect(Array.isArray(acciones)).toBe(true);
        }
      }
    });
  });
});
