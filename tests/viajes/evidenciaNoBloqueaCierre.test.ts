/**
 * Verificación estática de no-bloqueo del cierre (E8-T17, tarea 13).
 * Ningún archivo de cierre importa expediente, evidencia ni adjuntos. El análisis
 * de DetalleViaje.tsx admite solo la navegación al enlace de expediente.
 */
import { describe, expect, it } from 'vitest';

/** Código fuente de la carpeta de detalle, indexado por ruta absoluta de Vite (`/src/...`). */
const FUENTES_DETALLE = import.meta.glob('/src/features/viajes/detalle/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Fragmentos de ruta que el cierre no puede importar (normalizados a `/src/...`). */
const MODULOS_PROHIBIDOS = [
  '/src/features/viajes/expediente/',
  '/src/features/viajes/evidencia/',
  '/src/lib/api/expediente',
  '/src/lib/api/adjuntos',
];

/** Extrae el especificador de cada import, re-export o import dinámico. */
function especificadores(codigo: string): string[] {
  const patron =
    /(?:import|export)\s[^'";]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;
  return [...codigo.matchAll(patron)].map((match) => match[1] ?? match[2] ?? match[3] ?? '');
}

/** Resuelve un especificador a ruta absoluta de Vite: alias `@/` o relativo al archivo. */
function resolverEspecificador(archivo: string, especificador: string): string {
  if (especificador.startsWith('@/')) return `/src/${especificador.slice(2)}`;
  if (!especificador.startsWith('.')) return especificador;

  const segmentos = archivo.split('/').slice(0, -1);
  for (const segmento of especificador.split('/')) {
    if (segmento === '.' || segmento === '') continue;
    if (segmento === '..') segmentos.pop();
    else segmentos.push(segmento);
  }
  return segmentos.join('/');
}

function modulosProhibidosEn(archivo: string): string[] {
  return especificadores(FUENTES_DETALLE[archivo] ?? '')
    .map((especificador) => resolverEspecificador(archivo, especificador))
    .filter((ruta) => MODULOS_PROHIBIDOS.some((prohibido) => ruta.includes(prohibido)));
}

const ARCHIVOS_CIERRE = Object.keys(FUENTES_DETALLE).filter((ruta) =>
  /\/cierre[^/]*\.tsx?$/.test(ruta),
);

describe('E8-T17 · el cierre no depende de evidencia ni de expediente', () => {
  it('encuentra los archivos de cierre a analizar', () => {
    expect(ARCHIVOS_CIERRE.length).toBeGreaterThan(0);
  });

  for (const ruta of ARCHIVOS_CIERRE) {
    it(`${ruta} no importa expediente, evidencia ni adjuntos`, () => {
      expect(modulosProhibidosEn(ruta)).toEqual([]);
    });
  }

  it('DetalleViaje.tsx no importa módulos de expediente, evidencia ni adjuntos', () => {
    expect(modulosProhibidosEn('/src/features/viajes/detalle/DetalleViaje.tsx')).toEqual([]);
  });
});
