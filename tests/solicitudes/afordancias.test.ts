/*
 * M14 · acciones sobre una solicitud por estado y rol (matriz de Requirement 14/15).
 *
 * Una acción se ofrece si el rol tiene su capacidad y el estado es de origen válido. La tabla
 * recorre los ocho roles internos en cada estado: un rol que la matriz no nombra no gana nada.
 */
import { describe, expect, it } from 'vitest';
import { ESTADOS_SOLICITUD, type EstadoSolicitud } from '@/lib/contracts/solicitudes';
import { ROLES_INTERNOS } from '@/lib/permisos';
import {
  accionesPermitidas,
  estadoFijoDeBandeja,
  veDatosComerciales,
  type AccionSolicitud,
} from '@/features/solicitudes/afordancias';

const ESPERADO: Record<string, Partial<Record<EstadoSolicitud, readonly AccionSolicitud[]>>> = {
  jefe_operativo: { PAGADO: ['aprobar', 'rechazar'] },
  cotizacion: {
    SOLICITADO: ['cotizar'],
    COTIZADO: ['cotizar', 'confirmarPago'],
    PAGADO: ['reprogramar'],
  },
  administrador: {
    SOLICITADO: ['cotizar'],
    COTIZADO: ['cotizar', 'confirmarPago'],
    PAGADO: ['reprogramar', 'revertirPago', 'aprobar', 'rechazar'],
  },
};

describe('M14 · accionesPermitidas', () => {
  for (const rol of ROLES_INTERNOS) {
    for (const estado of ESTADOS_SOLICITUD) {
      it(`${rol} en ${estado}`, () => {
        const esperadas = ESPERADO[rol]?.[estado] ?? [];
        expect([...accionesPermitidas(estado, rol)].sort()).toEqual([...esperadas].sort());
      });
    }
  }

  it('un rol sin sesión no tiene acciones', () => {
    for (const estado of ESTADOS_SOLICITUD) {
      expect(accionesPermitidas(estado, undefined)).toEqual([]);
    }
  });
});

describe('M14 · datos comerciales y estado de la bandeja', () => {
  it('solo Cotización y Administrador ven datos comerciales; el Jefe Operativo no', () => {
    const ven = ROLES_INTERNOS.filter((rol) => veDatosComerciales(rol));
    expect([...ven].sort()).toEqual(['administrador', 'cotizacion']);
  });

  it('el Jefe Operativo siempre pide PAGADO; quien ve todo no fija estado', () => {
    expect(estadoFijoDeBandeja('jefe_operativo')).toBe('PAGADO');
    expect(estadoFijoDeBandeja('cotizacion')).toBeUndefined();
    expect(estadoFijoDeBandeja('administrador')).toBeUndefined();
  });
});
