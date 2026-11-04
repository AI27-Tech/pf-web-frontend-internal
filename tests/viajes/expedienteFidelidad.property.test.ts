/**
 * Feature: e8-t17-dashboard-descarga-evidencia, Property 2: Fidelidad del archivo del expediente.
 * Validates: Requirements 4.4, 4.5 (tarea 11).
 *
 * Para cualquier expediente que respeta el esquema, el archivo parseado es igual al payload,
 * sus claves están dentro de las contratadas y no aparecen `cuenta_espejo` ni `clave_amago`.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { serializarExpediente } from '@/features/viajes/expediente/entregarArchivo';
import type { DescargaViaje } from '@/lib/contracts/expediente';

const CLAVES_CONTRATADAS: Record<string, readonly string[]> = {
  raiz: ['viaje_id', 'ficha', 'bitacora', 'auditoria', 'generado_en'],
  ficha: ['estado', 'cliente_id', 'origen', 'destinos', 'fecha_hora_servicio', 'tipo_servicio'],
  destino: ['nombre', 'numero_envio'],
  bitacora: ['texto', 'autor', 'ts'],
  auditoria: ['entidad', 'actor', 'ts'],
};
const CLAVES_PROHIBIDAS = ['cuenta_espejo', 'clave_amago'];

function subcontexto(contexto: string, clave: string): string | null {
  if (contexto === 'raiz' && (clave === 'ficha' || clave === 'bitacora' || clave === 'auditoria')) {
    return clave;
  }
  if (contexto === 'ficha' && clave === 'destinos') return 'destino';
  return null;
}

/** Claves fuera de contrato o prohibidas, en cualquier nivel. */
function clavesNoPermitidas(valor: unknown, contexto: string, hallazgos: string[] = []): string[] {
  if (Array.isArray(valor)) {
    valor.forEach((elemento) => clavesNoPermitidas(elemento, contexto, hallazgos));
    return hallazgos;
  }
  if (valor === null || typeof valor !== 'object') return hallazgos;

  const permitidas = CLAVES_CONTRATADAS[contexto] ?? [];
  for (const [clave, hijo] of Object.entries(valor)) {
    if (CLAVES_PROHIBIDAS.includes(clave) || !permitidas.includes(clave)) {
      hallazgos.push(`${contexto}.${clave}`);
    }
    const siguiente = subcontexto(contexto, clave);
    if (siguiente) clavesNoPermitidas(hijo, siguiente, hallazgos);
  }
  return hallazgos;
}

const arbMarca = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-01-01'), noInvalidDate: true })
  .map((d) => d.toISOString());

const arbDestino = fc.record(
  { nombre: fc.string(), numero_envio: fc.string() },
  { requiredKeys: ['nombre'] },
);

const arbFicha = fc.record(
  {
    estado: fc.string(),
    cliente_id: fc.option(fc.uuid(), { nil: null }),
    origen: fc.string(),
    destinos: fc.array(arbDestino, { maxLength: 3 }),
    fecha_hora_servicio: fc.option(arbMarca, { nil: null }),
    tipo_servicio: fc.string(),
  },
  { requiredKeys: ['estado', 'origen', 'destinos'] },
);

const arbExpediente: fc.Arbitrary<DescargaViaje> = fc.record({
  viaje_id: fc.uuid(),
  ficha: arbFicha,
  bitacora: fc.array(fc.record({ texto: fc.string(), autor: fc.string(), ts: arbMarca }), {
    maxLength: 5,
  }),
  auditoria: fc.array(fc.record({ entidad: fc.string(), actor: fc.string(), ts: arbMarca }), {
    maxLength: 5,
  }),
  generado_en: arbMarca,
});

describe('Property 2 · fidelidad del archivo del expediente', () => {
  it('el archivo parseado es igual al payload, con claves contratadas y sin campos prohibidos', () => {
    fc.assert(
      fc.property(arbExpediente, (payload) => {
        const archivo = JSON.parse(serializarExpediente(payload));

        expect(archivo).toEqual(payload);
        expect(clavesNoPermitidas(archivo, 'raiz')).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});
