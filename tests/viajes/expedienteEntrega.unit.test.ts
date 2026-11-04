/**
 * Serialización y entrega del expediente (E8-T17, tarea 10).
 * Incluye la prueba obligatoria de la DoD: la descarga solo contiene campos
 * contratados y no incluye `cuenta_espejo` ni `clave_amago`.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  entregarArchivo,
  nombreExpediente,
  serializarExpediente,
} from '@/features/viajes/expediente/entregarArchivo';
import { descargarViajeMock } from '@/mocks/data';

/** Claves contratadas por `DescargaViaje` y sus subobjetos (openapi/bff). */
const CLAVES_CONTRATADAS: Record<string, readonly string[]> = {
  raiz: ['viaje_id', 'ficha', 'bitacora', 'auditoria', 'generado_en'],
  ficha: ['estado', 'cliente_id', 'origen', 'destinos', 'fecha_hora_servicio', 'tipo_servicio'],
  destino: ['nombre', 'numero_envio'],
  bitacora: ['texto', 'autor', 'ts'],
  auditoria: ['entidad', 'actor', 'ts'],
};
const CLAVES_PROHIBIDAS = ['cuenta_espejo', 'clave_amago'];

/** Recorre todos los niveles y devuelve las claves que no están contratadas o son prohibidas. */
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

function subcontexto(contexto: string, clave: string): string | null {
  if (contexto === 'raiz' && clave === 'ficha') return 'ficha';
  if (contexto === 'raiz' && clave === 'bitacora') return 'bitacora';
  if (contexto === 'raiz' && clave === 'auditoria') return 'auditoria';
  if (contexto === 'ficha' && clave === 'destinos') return 'destino';
  return null;
}

describe('serializarExpediente', () => {
  it('el contenido parseado es el payload recibido', () => {
    const payload = descargarViajeMock('VJ-1001');
    expect(payload).not.toBeNull();

    expect(JSON.parse(serializarExpediente(payload))).toEqual(payload);
  });

  it('serializa con sangría de dos espacios', () => {
    expect(serializarExpediente({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
});

describe('nombreExpediente', () => {
  it('devuelve siempre expediente-<viaje_id>.json', () => {
    expect(nombreExpediente('VJ-1001')).toBe('expediente-VJ-1001.json');
    expect(nombreExpediente('abc-123')).toBe('expediente-abc-123.json');
  });
});

describe('entregarArchivo', () => {
  const createObjectURL = vi.fn(() => 'blob:expediente-demo');
  const revokeObjectURL = vi.fn();

  beforeAll(() => {
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  afterEach(() => {
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    vi.restoreAllMocks();
  });

  it('crea el objectURL, dispara el ancla con el nombre provisional y revoca la URL', () => {
    const clicks: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push({ href: this.href, download: this.download });
    });

    entregarArchivo('{}', nombreExpediente('VJ-9'));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clicks).toEqual([{ href: 'blob:expediente-demo', download: 'expediente-VJ-9.json' }]);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:expediente-demo');
  });

  it('retira el ancla del documento al terminar', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    entregarArchivo('{}', 'expediente-VJ-9.json');

    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  });
});

describe('DoD E8-T17: la descarga solo contiene campos contratados', () => {
  it('el fixture del handler no trae claves fuera del contrato ni cuenta espejo ni clave amago', () => {
    const fixture = descargarViajeMock('VJ-1001');
    expect(clavesNoPermitidas(fixture, 'raiz')).toEqual([]);
  });

  it('la salida de serializarExpediente tampoco trae claves fuera del contrato', () => {
    const fixture = descargarViajeMock('VJ-1001');
    const archivo = JSON.parse(serializarExpediente(fixture));
    expect(clavesNoPermitidas(archivo, 'raiz')).toEqual([]);
  });

  it('detecta cuenta_espejo y clave_amago si aparecieran en cualquier nivel', () => {
    const contaminado = {
      ...descargarViajeMock('VJ-1001'),
      ficha: { estado: 'x', origen: 'y', destinos: [], cuenta_espejo: 'x' },
      bitacora: [{ texto: 'a', autor: 'b', ts: 'c', clave_amago: 'x' }],
    };
    const hallazgos = clavesNoPermitidas(contaminado, 'raiz');
    expect(hallazgos).toEqual(
      expect.arrayContaining(['ficha.cuenta_espejo', 'bitacora.clave_amago']),
    );
  });
});
