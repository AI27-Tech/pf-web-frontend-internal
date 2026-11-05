import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Rol } from '@ai27-tech/contracts/roles';
import type { EstadoEmergencia } from '@/lib/contracts/emergencias';
import {
  puedeAnotar,
  puedeCerrar,
  puedeDevolver,
  puedeActivar,
  puedeReclamar,
  puedeResolver,
  type CasoParaAfordancias,
} from './afordancias';

const ROLES = [
  'cliente',
  'jefe_operativo',
  'monitorista',
  'supervisor',
  'coordinador',
  'ejecutivo',
  'reaccion',
  'administrador',
] as const satisfies readonly Rol[];
const ESTADOS: EstadoEmergencia[] = ['abierta', 'en_atencion', 'resuelta', 'cerrada'];
const SUJETO = 'sujeto-a';
const OTRO = 'sujeto-b';

const arbRol = fc.constantFrom<Rol>(...ROLES);
const arbEstado = fc.constantFrom<EstadoEmergencia>(...ESTADOS);
const arbResponsable = fc.constantFrom<string | null>(SUJETO, OTRO, null);

function caso(estado: EstadoEmergencia, responsable: string | null): CasoParaAfordancias {
  return {
    estado,
    reclamo_activo:
      responsable === null
        ? null
        : {
            id: 'rc',
            conversacion_id: 'e',
            responsable_id: responsable,
            version: 1,
            abierto_en: '',
          },
  };
}

describe('afordancias de emergencias (P2: exclusividad por rol y estado)', () => {
  it('resolver implica rol reaccion y responsable igual al sujeto', () => {
    fc.assert(
      fc.property(arbRol, arbEstado, arbResponsable, (rol, estado, responsable) => {
        if (puedeResolver(rol, caso(estado, responsable), SUJETO)) {
          expect(rol).toBe('reaccion');
          expect(responsable).toBe(SUJETO);
        }
      }),
    );
  });

  it('cerrar implica estado resuelta y nunca reaccion ni ejecutivo', () => {
    fc.assert(
      fc.property(arbRol, arbEstado, arbResponsable, (rol, estado, responsable) => {
        if (puedeCerrar(rol, caso(estado, responsable))) {
          expect(estado).toBe('resuelta');
          expect(rol).not.toBe('reaccion');
          expect(rol).not.toBe('ejecutivo');
        }
      }),
    );
  });

  it('reclamar implica reaccion, abierta y sin responsable', () => {
    fc.assert(
      fc.property(arbRol, arbEstado, arbResponsable, (rol, estado, responsable) => {
        if (puedeReclamar(rol, caso(estado, responsable))) {
          expect(rol).toBe('reaccion');
          expect(estado).toBe('abierta');
          expect(responsable).toBeNull();
        }
      }),
    );
  });

  it('activar es falso para ejecutivo, reaccion y administrador en cualquier estado de viaje', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Rol>('ejecutivo', 'reaccion', 'administrador'),
        fc.string(),
        (rol, estadoViaje) => {
          expect(puedeActivar(rol, estadoViaje)).toBe(false);
        },
      ),
    );
  });

  it('activar es falso en estados terminales del viaje', () => {
    expect(puedeActivar('monitorista', 'EN_TRANSITO')).toBe(true);
    expect(puedeActivar('monitorista', 'CERRADO')).toBe(false);
  });

  it('devolver se ofrece solo en en_atencion, al responsable o a supervisor/coordinador', () => {
    fc.assert(
      fc.property(arbRol, arbEstado, arbResponsable, (rol, estado, responsable) => {
        if (puedeDevolver(rol, caso(estado, responsable), SUJETO)) {
          expect(estado).toBe('en_atencion');
          expect(responsable === SUJETO || rol === 'supervisor' || rol === 'coordinador').toBe(
            true,
          );
        }
      }),
    );
  });

  it('anotar nunca se ofrece a un caso cerrada', () => {
    fc.assert(
      fc.property(arbRol, arbResponsable, (rol, responsable) => {
        expect(puedeAnotar(rol, caso('cerrada', responsable))).toBe(false);
      }),
    );
  });
});
