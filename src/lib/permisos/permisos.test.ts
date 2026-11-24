/*
 * Prueba de tabla de la política: cada capacidad contra cada rol interno,
 * escrita a mano desde las matrices de `requirements.md` (no desde la fuente).
 */
import { describe, expect, it } from 'vitest';
import { TRANSICIONES_VIAJE } from '@/lib/contracts/viajeDetalle';
import {
  CAPACIDADES,
  EXCEPCIONES_ADM,
  MATRIZ,
  type Capacidad,
  capacidadDeTransicion,
  puede,
} from '.';
import { ROLES_INTERNOS } from './roles';

const POR_CODIGO: Record<string, string> = {
  JO: 'jefe_operativo',
  MON: 'monitorista',
  SUP: 'supervisor',
  COO: 'coordinador',
  ADM: 'administrador',
  EJE: 'ejecutivo',
  REA: 'reaccion',
  COT: 'cotizacion',
};

/** Roles esperados por capacidad, con ADM explícito. Una cadena vacía = nadie. */
const ESPERADO: Record<Capacidad, string> = {
  'panel.jefeOperativo': 'JO ADM',
  'viajes.listar': 'JO MON SUP COO ADM',
  'viaje.ver': 'JO MON SUP COO ADM',
  'reportes.ver': 'MON SUP COO ADM',
  'administracion.usuarios': 'ADM',
  'administracion.organizaciones': 'ADM',
  'viaje.crear': 'JO ADM',
  'alcance.leerPropio': 'MON SUP COO',
  'viaje.asignarEscolta': 'JO ADM',
  'viaje.marcarApto': 'JO MON SUP COO ADM',
  'viaje.avanzar': 'MON SUP COO ADM',
  'viaje.cerrar': 'JO ADM',
  'viaje.eta': 'MON SUP COO ADM',
  'viaje.fechaHora': 'JO ADM',
  'viaje.ficha.ver': 'JO MON SUP COO ADM',
  'viaje.ficha.editar': 'MON SUP COO ADM',
  'viaje.bitacora.registrar': 'MON SUP COO ADM',
  'viaje.historico.ver': 'JO MON SUP COO ADM',
  'viaje.estadia.operar': 'MON SUP COO ADM',
  'viaje.incidencia.abrir': 'MON SUP COO ADM',
  'viaje.incidencia.resolver': 'SUP COO ADM',
  'monitoreo.consultar': 'MON SUP COO ADM',
  'monitoreo.dashboard': 'MON SUP COO ADM',
  'emergencia.verDeViaje': 'MON SUP COO ADM',
  'emergencia.activar': 'MON SUP COO ADM',
  'emergencia.anotar': 'MON SUP COO ADM',
  'emergencia.cerrar': 'MON SUP COO ADM',
  'emergencia.bandeja': 'REA SUP COO',
  'emergencia.reclamar': 'REA',
  'emergencia.resolver': 'REA',
  'emergencia.devolver': 'REA SUP COO',
  'emergencia.transferir': 'REA SUP COO',
  'emergencia.gestionarAjeno': 'SUP COO',
  'conversacion.leer': 'EJE SUP COO ADM',
  'conversacion.operar': 'EJE ADM',
  'roster.ver': 'JO ADM',
  'roster.unidad.editar': 'JO ADM',
  'alcance.clientes.fijar': 'JO ADM',
  'alcance.subordinados.fijar': 'ADM',
  'solicitud.listar': 'JO COT ADM',
  'solicitud.ver': 'JO COT ADM',
  'solicitud.verComercial': 'COT ADM',
  'solicitud.cotizar': 'COT ADM',
  'solicitud.reprogramar': 'COT ADM',
  'solicitud.confirmarPago': 'COT ADM',
  'solicitud.revertirPago': 'ADM',
  'solicitud.aprobar': 'JO ADM',
  'solicitud.rechazar': 'JO ADM',
  'solicitud.conversacion': 'COT ADM',
  'catalogos.ver': 'JO COO ADM',
  'catalogos.escribir': 'COO ADM',
};

const esperados = (capacidad: Capacidad): string[] =>
  ESPERADO[capacidad]
    .split(' ')
    .filter(Boolean)
    .map((codigo) => POR_CODIGO[codigo] as string);

describe('política de capacidades', () => {
  it('la tabla esperada cubre exactamente las capacidades definidas', () => {
    expect([...CAPACIDADES].sort()).toEqual(Object.keys(ESPERADO).sort());
  });

  describe.each(CAPACIDADES.map((c) => [c] as const))('%s', (capacidad) => {
    it.each(ROLES_INTERNOS.map((r) => [r] as const))('%s', (rol) => {
      expect(puede(rol, capacidad)).toBe(esperados(capacidad).includes(rol));
    });
  });

  it('un rol sintético, nulo o ausente no tiene ninguna capacidad', () => {
    for (const capacidad of CAPACIDADES) {
      expect(puede('rol_futuro', capacidad)).toBe(false);
      expect(puede(null, capacidad)).toBe(false);
      expect(puede(undefined, capacidad)).toBe(false);
      expect(puede('', capacidad)).toBe(false);
    }
  });

  it('el rol cliente no tiene ninguna capacidad del panel', () => {
    for (const capacidad of CAPACIDADES) expect(puede('cliente', capacidad)).toBe(false);
  });

  it('administrador tiene toda capacidad o figura en las excepciones con su fuente', () => {
    for (const capacidad of CAPACIDADES) {
      const fuente = EXCEPCIONES_ADM[capacidad];
      if (fuente === undefined) {
        expect(MATRIZ[capacidad], capacidad).toContain('administrador');
      } else {
        expect(fuente.length, capacidad).toBeGreaterThan(0);
        expect(MATRIZ[capacidad], capacidad).not.toContain('administrador');
      }
    }
  });

  it('toda excepción del administrador apunta a una capacidad existente', () => {
    for (const capacidad of Object.keys(EXCEPCIONES_ADM)) {
      expect(CAPACIDADES).toContain(capacidad);
    }
  });
});

describe('transiciones del viaje', () => {
  const DESTINOS = [...new Set(TRANSICIONES_VIAJE.map(([, hacia]) => hacia as string))];

  it.each(DESTINOS.map((d) => [d] as const))('el destino %s tiene mapeo explícito', (destino) => {
    expect(capacidadDeTransicion(destino), `destino sin capacidad: ${destino}`).not.toBeUndefined();
  });

  it('el destino que dispara el cliente no se ofrece a ningún rol', () => {
    expect(capacidadDeTransicion('CANCELADO_POR_CLIENTE')).toBeNull();
  });

  it('un destino que ya no existe en el contrato no tiene mapeo', () => {
    expect(capacidadDeTransicion('SOLICITADO')).toBeUndefined();
    expect(capacidadDeTransicion('RECHAZADO_POR_AI27')).toBeUndefined();
  });

  it('el mapeo solo usa capacidades que existen', () => {
    for (const destino of DESTINOS) {
      const capacidad = capacidadDeTransicion(destino);
      if (capacidad) expect(CAPACIDADES).toContain(capacidad);
    }
  });

  it('cerrar es de JO y ADM; avanzar de monitoreo y ADM, no del JO', () => {
    expect(puede('jefe_operativo', capacidadDeTransicion('CERRADO') as Capacidad)).toBe(true);
    expect(puede('monitorista', capacidadDeTransicion('CERRADO') as Capacidad)).toBe(false);
    expect(puede('jefe_operativo', capacidadDeTransicion('EN_TRANSITO') as Capacidad)).toBe(false);
    expect(puede('supervisor', capacidadDeTransicion('EN_TRANSITO') as Capacidad)).toBe(true);
  });
});
